//! Local folder references, culling metadata, and bounded library I/O.
mod preview;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
    time::UNIX_EPOCH,
};
use tauri::{
    ipc::{InvokeBody, Request, Response},
    AppHandle, Manager, State, WebviewWindow,
};
use tauri_plugin_dialog::DialogExt;

type Result<T> = std::result::Result<T, String>;

const RAW: &[&str] = &["dng", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2"];

#[derive(Default)]
pub struct Library {
    db: Mutex<Option<Connection>>,
    export: Mutex<Option<(u64, PathBuf)>>,
    export_id: std::sync::atomic::AtomicU64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    id: i64,
    path: String,
    name: String,
    count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Photo {
    id: i64,
    folder_id: i64,
    name: String,
    raw: bool,
    available: bool,
    revision: String,
    rating: u8,
    flag: i8,
}

#[derive(Serialize)]
pub struct Catalog {
    folders: Vec<Folder>,
    photos: Vec<Photo>,
}

fn text(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn lock<T>(mutex: &Mutex<T>) -> Result<MutexGuard<'_, T>> {
    mutex
        .lock()
        .map_err(|_| "Etch could not access the catalog.".into())
}

fn open_catalog(path: &Path) -> Result<Connection> {
    let connection = Connection::open(path).map_err(text)?;
    connection
        .execute_batch(
            "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            raw INTEGER NOT NULL,
            revision TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
            flag INTEGER NOT NULL DEFAULT 0 CHECK (flag BETWEEN -1 AND 1)
        );
        CREATE TABLE IF NOT EXISTS folder_photos (
            folder_id INTEGER NOT NULL REFERENCES folders(id),
            photo_id INTEGER NOT NULL REFERENCES photos(id),
            available INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY(folder_id, photo_id)
        );
        CREATE INDEX IF NOT EXISTS memberships_photo ON folder_photos(photo_id, available);
    ",
        )
        .map_err(text)?;
    Ok(connection)
}

impl Library {
    fn with_db<T>(
        &self,
        app: &AppHandle,
        run: impl FnOnce(&mut Connection) -> Result<T>,
    ) -> Result<T> {
        let mut state = lock(&self.db)?;
        if state.is_none() {
            let dir = app.path().app_data_dir().map_err(text)?;
            fs::create_dir_all(&dir).map_err(text)?;
            *state = Some(open_catalog(&dir.join("photos.sqlite3"))?);
        }
        run(state.as_mut().expect("catalog opened"))
    }
}

fn snapshot(db: &Connection) -> Result<Catalog> {
    let mut query = db
        .prepare(
            "SELECT f.id,f.path,f.name,COUNT(p.photo_id) FROM folders f
        LEFT JOIN folder_photos p ON p.folder_id=f.id AND p.available=1
        GROUP BY f.id ORDER BY f.name COLLATE NOCASE, f.id",
        )
        .map_err(text)?;
    let folders = query
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                count: row.get(3)?,
            })
        })
        .map_err(text)?
        .collect::<rusqlite::Result<_>>()
        .map_err(text)?;
    let mut query = db
        .prepare(
            "SELECT p.id,f.folder_id,p.name,p.raw,f.available,p.revision,p.rating,p.flag
        FROM photos p JOIN folder_photos f ON f.photo_id=p.id
        ORDER BY f.folder_id,p.path COLLATE NOCASE,p.id",
        )
        .map_err(text)?;
    let photos = query
        .query_map([], |row| {
            Ok(Photo {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                name: row.get(2)?,
                raw: row.get(3)?,
                available: row.get(4)?,
                revision: row.get(5)?,
                rating: row.get(6)?,
                flag: row.get(7)?,
            })
        })
        .map_err(text)?
        .collect::<rusqlite::Result<_>>()
        .map_err(text)?;
    Ok(Catalog { folders, photos })
}

struct ImportPhoto {
    path: String,
    name: String,
    raw: bool,
    revision: String,
}

fn scan(root: &Path) -> Result<Vec<ImportPhoto>> {
    let mut dirs = vec![root.to_owned()];
    let mut found = Vec::new();
    while let Some(dir) = dirs.pop() {
        for entry in fs::read_dir(&dir)
            .map_err(|error| format!("Could not read {}: {error}", dir.display()))?
        {
            let item = entry.map_err(text)?;
            let kind = item.file_type().map_err(text)?;
            if kind.is_dir() {
                if !item.file_name().to_string_lossy().starts_with('.') {
                    dirs.push(item.path());
                }
            } else if kind.is_file() {
                let path = item.path();
                let Some(ext) = path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(str::to_ascii_lowercase)
                else {
                    continue;
                };
                let raw = RAW.contains(&ext.as_str());
                if !raw && !matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp") {
                    continue;
                }
                let Some(path_string) = path.to_str() else {
                    continue;
                };
                let metadata = item.metadata().map_err(text)?;
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                    .map_or(0, |time| time.as_nanos());
                found.push(ImportPhoto {
                    path: path_string.to_string(),
                    name: item.file_name().to_string_lossy().into_owned(),
                    raw,
                    revision: format!("{modified}-{}", metadata.len()),
                });
            }
        }
    }
    Ok(found)
}

fn import(db: &mut Connection, root: &Path, items: Vec<ImportPhoto>) -> Result<i64> {
    let path = root
        .to_str()
        .ok_or("This folder name cannot be represented in the catalog.")?;
    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(path);
    let tx = db.transaction().map_err(text)?;
    let folder = tx
        .query_row(
            "INSERT INTO folders(path,name) VALUES(?1,?2)
        ON CONFLICT(path) DO UPDATE SET name=excluded.name RETURNING id",
            params![path, name],
            |row| row.get::<_, i64>(0),
        )
        .map_err(text)?;
    tx.execute(
        "UPDATE folder_photos SET available=0 WHERE folder_id=?1",
        [folder],
    )
    .map_err(text)?;
    {
        let mut insert = tx
            .prepare_cached(
                "INSERT INTO photos(path,name,raw,revision) VALUES (?1,?2,?3,?4)
            ON CONFLICT(path) DO UPDATE SET name=excluded.name,raw=excluded.raw,
            revision=excluded.revision RETURNING id",
            )
            .map_err(text)?;
        let mut add = tx
            .prepare_cached(
                "INSERT INTO folder_photos(folder_id,photo_id) VALUES (?1,?2)
            ON CONFLICT(folder_id,photo_id) DO UPDATE SET available=1",
            )
            .map_err(text)?;
        for item in items {
            let photo = insert
                .query_row(
                    params![item.path, item.name, item.raw, item.revision],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(text)?;
            add.execute(params![folder, photo]).map_err(text)?;
        }
    }
    tx.commit().map_err(text)?;
    Ok(folder)
}

fn photo_source(db: &Connection, id: i64) -> Result<(PathBuf, bool, String)> {
    let source = db
        .query_row(
            "SELECT path,raw,revision FROM photos WHERE id=?1
        AND EXISTS(SELECT 1 FROM folder_photos WHERE photo_id=?1 AND available=1)",
            [id],
            |row| {
                Ok((
                    PathBuf::from(row.get::<_, String>(0)?),
                    row.get(1)?,
                    row.get(2)?,
                ))
            },
        )
        .optional()
        .map_err(text)?
        .ok_or("This photo is unavailable. Reimport its folder to refresh the catalog.")?;
    if source.0.canonicalize().ok().as_ref() != Some(&source.0) || !source.0.is_file() {
        return Err("The original could not be found at its imported path.".into());
    }
    Ok(source)
}

fn mark(db: &Connection, id: i64, rating: Option<u8>, flag: Option<i8>) -> Result<()> {
    if rating.is_some_and(|n| n > 5) || flag.is_some_and(|n| !(-1..=1).contains(&n)) {
        return Err("Invalid photo rating or flag.".into());
    }
    let count = db
        .execute(
            "UPDATE photos SET rating=COALESCE(?2,rating), flag=COALESCE(?3,flag) WHERE id=?1",
            params![id, rating, flag],
        )
        .map_err(text)?;
    if count == 0 {
        return Err("This photo is missing from the catalog.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn library_catalog(app: AppHandle, library: State<'_, Library>) -> Result<Catalog> {
    library.with_db(&app, |db| snapshot(db))
}

#[tauri::command]
pub async fn library_import(
    app: AppHandle,
    window: WebviewWindow,
) -> Result<Option<(i64, Catalog)>> {
    let chosen = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Import photo folder")
        .blocking_pick_folder();
    let Some(chosen) = chosen else {
        return Ok(None);
    };
    let root = chosen
        .into_path()
        .map_err(text)?
        .canonicalize()
        .map_err(text)?;
    tauri::async_runtime::spawn_blocking(move || {
        let items = scan(&root)?;
        app.state::<Library>().with_db(&app, |db| {
            let folder = import(db, &root, items)?;
            Ok(Some((folder, snapshot(db)?)))
        })
    })
    .await
    .map_err(text)?
}

#[tauri::command]
pub async fn library_mark(
    app: AppHandle,
    library: State<'_, Library>,
    id: i64,
    rating: Option<u8>,
    flag: Option<i8>,
) -> Result<()> {
    library.with_db(&app, |db| mark(db, id, rating, flag))
}

#[tauri::command]
pub async fn library_read(
    app: AppHandle,
    library: State<'_, Library>,
    id: i64,
) -> Result<Response> {
    let (path, _, _) = library.with_db(&app, |db| photo_source(db, id))?;
    let bytes = tauri::async_runtime::spawn_blocking(move || fs::read(path))
        .await
        .map_err(text)?
        .map_err(text)?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn library_preview(
    app: AppHandle,
    library: State<'_, Library>,
    id: i64,
    large: bool,
) -> Result<Response> {
    let (path, raw, revision) = library.with_db(&app, |db| photo_source(db, id))?;
    let cache = app.path().app_cache_dir().map_err(text)?.join("library-v1");
    tauri::async_runtime::spawn_blocking(move || {
        let edge = if large { 1600 } else { 384 };
        let file = cache.join(format!("{id}-{revision}-{edge}.jpg"));
        if let Ok(bytes) = fs::read(&file) {
            if bytes.starts_with(&[0xff, 0xd8]) && bytes.ends_with(&[0xff, 0xd9]) {
                return Ok(Response::new(bytes));
            }
        }
        let bytes = preview::jpeg(&path, edge, raw)
            .ok_or("This camera preview is unavailable. Open the original in Edit.")?;
        if fs::create_dir_all(&cache).is_ok() {
            let _ = fs::write(file, &bytes);
        }
        Ok(Response::new(bytes))
    })
    .await
    .map_err(text)?
}

#[tauri::command]
pub async fn library_export_begin(
    app: AppHandle,
    window: WebviewWindow,
    library: State<'_, Library>,
) -> Result<Option<u64>> {
    let choice = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Choose batch export folder")
        .blocking_pick_folder();
    let Some(choice) = choice else {
        return Ok(None);
    };
    let mut export = lock(&library.export)?;
    if export.is_some() {
        return Err("There is already a library export in progress.".into());
    }
    let id = library
        .export_id
        .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        + 1;
    *export = Some((
        id,
        choice
            .into_path()
            .map_err(text)?
            .canonicalize()
            .map_err(text)?,
    ));
    Ok(Some(id))
}

fn save_export(folder: &Path, name: &str, bytes: &[u8]) -> Result<String> {
    crate::export_files::save_unique(folder, name, bytes, &["jpg", "png", "webp"])
}

#[tauri::command]
pub async fn library_export_write(
    library: State<'_, Library>,
    request: Request<'_>,
) -> Result<String> {
    let export_id = request
        .headers()
        .get("x-etch-export")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok());
    let name = request
        .headers()
        .get("x-etch-filename")
        .and_then(|v| v.to_str().ok())
        .ok_or("Missing export filename.")?;
    let name = percent_encoding::percent_decode_str(name)
        .decode_utf8()
        .map_err(text)?
        .into_owned();
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Missing exported bytes.".into());
    };
    if bytes.is_empty() {
        return Err("Missing exported bytes.".into());
    }
    let dir = lock(&library.export)?
        .as_ref()
        .filter(|(id, _)| Some(*id) == export_id)
        .map(|(_, dir)| dir.clone())
        .ok_or("This export is no longer active.")?;
    let bytes = bytes.to_vec();
    tauri::async_runtime::spawn_blocking(move || save_export(&dir, &name, &bytes))
        .await
        .map_err(text)?
}

#[tauri::command]
pub fn library_export_end(library: State<'_, Library>, id: u64) -> Result<()> {
    let mut export = lock(&library.export)?;
    if export.as_ref().is_some_and(|(current, _)| *current == id) {
        *export = None;
    }
    Ok(())
}

#[cfg(test)]
mod tests;
