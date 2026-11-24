//! Etch desktop shell (roadmap §10, phase D1).
//!
//! Hosts the static export of the web editor (`out/`) in the system webview and
//! gives it native file saving and dialogs. `etch-core` attaches here later.

mod menu;
mod opened_files;
mod recent;
mod updates;

use std::path::Path;

use percent_encoding::percent_decode_str;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

const FILENAME_HEADER: &str = "x-etch-filename";

/// Keeps only the final path component, so a suggested name can't point the
/// Save sheet at another folder.
fn suggested_file_name(raw: &str) -> String {
    let decoded = percent_decode_str(raw).decode_utf8_lossy();
    Path::new(decoded.as_ref())
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("Untitled")
        .to_owned()
}

/// Shows the native Save sheet and writes the request body to the chosen file.
///
/// The page sends only bytes and a suggested name; the path comes from the
/// user's choice in the sheet, so the webview can never write anywhere else.
/// Returns `false` when the user cancels.
#[tauri::command]
async fn save_file(app: AppHandle, window: WebviewWindow, request: Request<'_>) -> Result<bool, String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the file's bytes.".into());
    };
    let name = request
        .headers()
        .get(FILENAME_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(suggested_file_name)
        .unwrap_or_else(|| "Untitled".to_owned());

    let mut dialog = app.dialog().file().set_parent(&window).set_file_name(&name);
    if let Some(extension) = Path::new(&name).extension().and_then(|ext| ext.to_str()) {
        dialog = dialog.add_filter(extension.to_uppercase(), &[extension]);
    }
    let Some(choice) = dialog.blocking_save_file() else {
        return Ok(false);
    };
    let path = choice.into_path().map_err(|error| error.to_string())?;
    std::fs::write(&path, bytes).map_err(|error| format!("Could not save {}: {error}", path.display()))?;
    // Saved projects belong in Open Recent; exported images don't.
    if path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("etch")) {
        recent::remember(&app, &path);
    }
    Ok(true)
}

fn message_kind(kind: Option<&str>) -> MessageDialogKind {
    match kind {
        Some("error") => MessageDialogKind::Error,
        Some("warning") => MessageDialogKind::Warning,
        _ => MessageDialogKind::Info,
    }
}

/// Native replacement for `window.alert`, shown as a sheet on the window.
#[tauri::command]
async fn show_message(app: AppHandle, window: WebviewWindow, title: String, message: String, kind: Option<String>) {
    app.dialog()
        .message(message)
        .title(title)
        .kind(message_kind(kind.as_deref()))
        .parent(&window)
        .blocking_show();
}

/// Native replacement for `window.confirm`. Returns `true` when confirmed.
#[tauri::command]
async fn ask_confirm(app: AppHandle, window: WebviewWindow, title: String, message: String, confirm_label: Option<String>) -> bool {
    app.dialog()
        .message(message)
        .title(title)
        .kind(MessageDialogKind::Warning)
        .parent(&window)
        .buttons(MessageDialogButtons::OkCancelCustom(confirm_label.unwrap_or_else(|| "OK".into()), "Cancel".into()))
        .blocking_show()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(opened_files::OpenedFiles::default())
        .menu(menu::build)
        .setup(|app| {
            recent::refresh_menu(app.handle());
            updates::schedule(app.handle());
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == updates::MENU_ID {
                tauri::async_runtime::spawn(updates::check(app.clone(), true));
            } else if !recent::handle_menu(app, id) {
                menu::forward(app, id);
            }
        })
        .invoke_handler(tauri::generate_handler![
            save_file,
            show_message,
            ask_confirm,
            opened_files::take_opened_files,
            opened_files::read_opened_file,
            opened_files::pick_file,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Etch");

    app.run(|handle, event| {
        // Finder double-click, "Open With" and drops on the Dock icon.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            let paths = urls.into_iter().filter_map(|url| url.to_file_path().ok()).collect();
            opened_files::receive(handle, paths);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (handle, event);
    });
}

#[cfg(test)]
mod tests {
    use super::suggested_file_name;

    #[test]
    fn keeps_plain_and_unicode_names() {
        assert_eq!(suggested_file_name("photo_custom.jpeg"), "photo_custom.jpeg");
        assert_eq!(suggested_file_name("Caf%C3%A9%20look.etchlook"), "Café look.etchlook");
    }

    #[test]
    fn strips_directories_and_empty_names() {
        assert_eq!(suggested_file_name("..%2F..%2F.ssh%2Fauthorized_keys"), "authorized_keys");
        assert_eq!(suggested_file_name("%2Ftmp%2Fx.zip"), "x.zip");
        assert_eq!(suggested_file_name(""), "Untitled");
        assert_eq!(suggested_file_name(".."), "Untitled");
    }
}
