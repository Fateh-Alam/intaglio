use super::*;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Instant, SystemTime};

struct Scratch(PathBuf);
impl Scratch {
    fn new() -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let serial = NEXT.fetch_add(1, Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!(
            "etch-library-{}-{stamp}-{serial}",
            std::process::id()
        ));
        fs::create_dir(&root).unwrap();
        Self(root.canonicalize().unwrap())
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn ratings_survive_restart_reimport_and_overlapping_folders() {
    let scratch = Scratch::new();
    let parent = scratch.0.join("photos");
    let child = parent.join("day-two");
    fs::create_dir_all(&child).unwrap();
    fs::write(child.join("ONE.CR3"), b"catalog test").unwrap();
    fs::write(child.join("notes.txt"), b"ignored").unwrap();
    let db_path = scratch.0.join("catalog.sqlite3");
    let mut db = open_catalog(&db_path).unwrap();
    let import_folder =
        |db: &mut Connection, folder: &Path| import(db, folder, scan(folder).unwrap()).unwrap();
    let folder = import_folder(&mut db, &parent);
    let [one] = snapshot(&db).unwrap().photos.try_into().ok().unwrap();
    assert!(one.raw);
    mark(&db, one.id, Some(4), Some(1)).unwrap();
    assert!(mark(&db, one.id, Some(6), None).is_err());
    drop(db);

    let mut db = open_catalog(&db_path).unwrap();
    assert_eq!(folder, import_folder(&mut db, &parent));
    import_folder(&mut db, &child);
    let images = snapshot(&db).unwrap().photos;
    assert_eq!(images.len(), 2);
    assert!(images
        .iter()
        .all(|photo| photo.id == one.id && photo.rating == 4 && photo.flag == 1));
    fs::remove_file(child.join("ONE.CR3")).unwrap();
    import_folder(&mut db, &parent);
    assert!(photo_source(&db, one.id).is_err());
    assert!(!snapshot(&db).unwrap().photos[0].available);
}

#[test]
fn export_avoids_overwriting_and_rejects_an_outside_destination() {
    let scratch = Scratch::new();
    fs::write(scratch.0.join("frame.jpg"), b"original").unwrap();
    assert_eq!(
        save_export(&scratch.0, "frame.jpg", b"output").unwrap(),
        "frame-2.jpg"
    );
    assert_eq!(fs::read(scratch.0.join("frame.jpg")).unwrap(), b"original");
    assert_eq!(fs::read(scratch.0.join("frame-2.jpg")).unwrap(), b"output");
    assert!(save_export(&scratch.0, "../frame.jpg", b"no").is_err());
    assert!(save_export(&scratch.0, "loop.mp4", b"video").is_err());

    let save_video = |bytes: &[u8]| crate::export_files::save_unique(&scratch.0, "loop.mp4", bytes, &["mp4"]);
    assert_eq!(save_video(b"first").unwrap(), "loop.mp4");
    assert_eq!(save_video(b"second").unwrap(), "loop-2.mp4");
    assert_eq!(fs::read(scratch.0.join("loop.mp4")).unwrap(), b"first");
}

#[test]
#[ignore = "requires the downloaded camera RAW fixtures"]
fn real_camera_previews() {
    let root = std::env::var("ETCH_LIBRARY_RAWS").expect("set ETCH_LIBRARY_RAWS");
    let root = Path::new(&root).canonicalize().unwrap();
    let items = scan(&root).unwrap();
    let mut previews = 0;
    for item in items.iter().filter(|item| item.raw) {
        let start = Instant::now();
        let bytes = preview::jpeg(Path::new(&item.path), 384, true);
        eprintln!(
            "{} {} ms, {} bytes",
            item.name,
            start.elapsed().as_millis(),
            bytes.as_ref().map_or(0, Vec::len)
        );
        if let Some(bytes) = bytes {
            let image = image::load_from_memory(&bytes).unwrap();
            assert!(
                image.width().max(image.height()) <= 384 && image.width().min(image.height()) > 60
            );
            previews += 1;
        }
    }
    assert!(
        previews >= 8,
        "camera embedded previews failed on one or more fixture families"
    );
}

#[test]
#[ignore = "requires a local folder of at least 2,000 distinct photos"]
fn real_photo_library_benchmark() {
    let root = std::env::var("ETCH_LIBRARY_SHOOT").expect("set ETCH_LIBRARY_SHOOT");
    let root = Path::new(&root).canonicalize().unwrap();
    let scratch = Scratch::new();
    let db_path = scratch.0.join("shoot.sqlite3");
    let mut db = open_catalog(&db_path).unwrap();
    let started = Instant::now();
    let mut inputs = scan(&root).unwrap();
    inputs.sort_unstable_by(|a, b| a.path.cmp(&b.path));
    assert!(
        inputs.len() >= 2000,
        "only {} unique photo paths",
        inputs.len()
    );
    inputs.truncate(2000);
    import(&mut db, &root, inputs).unwrap();
    let photos = snapshot(&db).unwrap().photos;
    assert_eq!(photos.len(), 2000);
    let import_ms = started.elapsed().as_secs_f64() * 1000.0;

    let mut times = Vec::new();
    let mut marks = Vec::new();
    let mut picked = 0;
    for (index, photo) in photos.iter().enumerate() {
        let started = Instant::now();
        let (source, raw, _) = photo_source(&db, photo.id).unwrap();
        let bytes = preview::jpeg(&source, 384, raw)
            .unwrap_or_else(|| panic!("preview missing for {}", photo.name));
        assert!(bytes.starts_with(&[0xff, 0xd8]) && bytes.ends_with(&[0xff, 0xd9]));
        times.push(started.elapsed().as_secs_f64() * 1000.0);

        let started = Instant::now();
        let flag = if index % 7 == 0 { 1 } else { -1 };
        let rating = if flag == 1 { 4 } else { 0 };
        mark(&db, photo.id, Some(rating), Some(flag)).unwrap();
        marks.push(started.elapsed().as_secs_f64() * 1000.0);
        picked += usize::from(flag == 1);
    }

    drop(db);
    let reopened = snapshot(&open_catalog(&db_path).unwrap()).unwrap();
    assert_eq!(
        reopened
            .photos
            .iter()
            .filter(|photo| photo.flag == 1 && photo.rating == 4)
            .count(),
        picked
    );
    assert_eq!(
        reopened
            .photos
            .iter()
            .filter(|photo| photo.flag == -1)
            .count(),
        2000 - picked
    );
    times.sort_by(f64::total_cmp);
    marks.sort_by(f64::total_cmp);
    println!(
        "library-bench {}",
        serde_json::json!({
            "photos": 2000, "picks": picked, "importMs": import_ms,
            "previewP95Ms": times[1899], "ratingP95Ms": marks[1899],
        })
    );
}
