use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::Path,
};

/// Create a unique file in the folder selected by the user.
pub(super) fn save_unique(
    folder: &Path,
    name: &str,
    bytes: &[u8],
    allowed_extensions: &[&str],
) -> Result<String, String> {
    if name.is_empty()
        || Path::new(name).file_name().and_then(|n| n.to_str()) != Some(name)
        || name.starts_with('.')
    {
        return Err("Invalid export filename.".into());
    }
    let input = Path::new(name);
    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid export name.")?;
    let extension = input
        .extension()
        .and_then(|s| s.to_str())
        .ok_or("Missing export extension.")?;
    if !allowed_extensions.contains(&extension) {
        return Err("Unsupported export extension.".into());
    }
    for copy in 1..=100_000 {
        let name = if copy == 1 {
            name.to_string()
        } else {
            format!("{stem}-{copy}.{extension}")
        };
        let path = folder.join(&name);
        let mut file = match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error.to_string()),
        };
        if let Err(error) = file.write_all(bytes) {
            drop(file);
            let _ = fs::remove_file(&path);
            return Err(error.to_string());
        }
        return Ok(name);
    }
    Err("The export folder has too many files with this name.".into())
}
