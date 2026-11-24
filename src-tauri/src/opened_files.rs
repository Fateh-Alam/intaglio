//! Files macOS hands to Etch: double-clicked in Finder, "Open With", or
//! dropped on the Dock icon.
//!
//! macOS can deliver them before the editor has loaded, so they wait in a
//! queue that the page drains when it is ready. The page can read only files
//! that arrived this way; it can't ask for any other path.

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

pub const OPEN_FILES_EVENT: &str = "etch:open-files";

#[derive(Default)]
pub struct OpenedFiles {
    pending: Mutex<Vec<PathBuf>>,
    readable: Mutex<HashSet<PathBuf>>,
}

#[derive(Serialize)]
pub struct OpenedFile {
    path: String,
    name: String,
}

/// Queues files from the OS and tells the editor they are waiting.
pub fn receive<R: Runtime>(app: &AppHandle<R>, paths: Vec<PathBuf>) {
    let paths: Vec<PathBuf> = paths.into_iter().filter(|path| path.is_file()).collect();
    if paths.is_empty() {
        return;
    }
    for path in &paths {
        crate::recent::remember(app, path);
    }
    let state = app.state::<OpenedFiles>();
    state.readable.lock().unwrap().extend(paths.iter().cloned());
    state.pending.lock().unwrap().extend(paths);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    let _ = app.emit(OPEN_FILES_EVENT, ());
}

/// Hands the editor every file waiting to be opened, oldest first.
#[tauri::command]
pub fn take_opened_files(state: State<'_, OpenedFiles>) -> Vec<OpenedFile> {
    state
        .pending
        .lock()
        .unwrap()
        .drain(..)
        .map(|path| OpenedFile {
            name: path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default(),
            path: path.to_string_lossy().into_owned(),
        })
        .collect()
}

/// Reads a file the OS opened with Etch, as raw bytes.
#[tauri::command]
pub async fn read_opened_file(state: State<'_, OpenedFiles>, path: String) -> Result<tauri::ipc::Response, String> {
    let path = PathBuf::from(path);
    if !state.readable.lock().unwrap().contains(&path) {
        return Err("Etch can only read files you opened with it.".into());
    }
    let bytes = read_off_main_thread(path.clone()).await.map_err(|error| format!("Could not read {}: {error}", path.display()))?;
    Ok(tauri::ipc::Response::new(bytes))
}

async fn read_off_main_thread(path: PathBuf) -> std::io::Result<Vec<u8>> {
    tauri::async_runtime::spawn_blocking(move || std::fs::read(path))
        .await
        .map_err(std::io::Error::other)?
}

const PHOTO_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "dng", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2"];

/// Shows the native Open panel. The chosen file takes the same path as a
/// Finder double-click, so it lands in Open Recent and the editor opens it.
/// Returns `false` if the user cancels.
#[tauri::command]
pub async fn pick_file(app: AppHandle, window: WebviewWindow, kind: String) -> Result<bool, String> {
    let (filter, extensions): (&str, &[&str]) = match kind.as_str() {
        "photo" => ("Photographs", PHOTO_EXTENSIONS),
        "project" => ("Etch Projects", &["etch", "intaglio"]),
        "look" => ("Etch Looks", &["etchlook", "int"]),
        other => return Err(format!("Unknown file kind: {other}")),
    };
    let choice = app.dialog().file().set_parent(&window).add_filter(filter, extensions).blocking_pick_file();
    let Some(choice) = choice else { return Ok(false) };
    let path = choice.into_path().map_err(|error| error.to_string())?;
    receive(&app, vec![path]);
    Ok(true)
}
