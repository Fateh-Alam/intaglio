//! Keeping Etch up to date.
//!
//! Etch checks for a new version at most once a day, a few seconds after
//! launch, and whenever someone chooses Etch → Check for Updates…. The check
//! downloads a small `latest.json` from the project's GitHub releases; no
//! photos or edits are sent. Updates are signed with Etch's own update key and
//! verified before they are installed, and nothing installs without a yes.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

pub const MENU_ID: &str = "check-updates";
const CHECK_EVERY: Duration = Duration::from_secs(24 * 60 * 60);
const FIRST_CHECK_DELAY: Duration = Duration::from_secs(8);

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_secs()).unwrap_or_default()
}

fn stamp_file<R: Runtime>(app: &AppHandle<R>) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("last-update-check"))
}

/// Whether a day has passed since the last automatic check.
fn due<R: Runtime>(app: &AppHandle<R>) -> bool {
    let last = stamp_file(app)
        .and_then(|file| std::fs::read_to_string(file).ok())
        .and_then(|text| text.trim().parse::<u64>().ok())
        .unwrap_or(0);
    is_due(last, now_secs())
}

fn is_due(last_check: u64, now: u64) -> bool {
    now.saturating_sub(last_check) >= CHECK_EVERY.as_secs()
}

fn mark_checked<R: Runtime>(app: &AppHandle<R>) {
    if let Some(file) = stamp_file(app) {
        if let Some(dir) = file.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(file, now_secs().to_string());
    }
}

/// Starts the once-a-day background check.
pub fn schedule<R: Runtime>(app: &AppHandle<R>) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        sleep_off_main_thread(FIRST_CHECK_DELAY).await;
        if due(&app) {
            check(app, false).await;
        }
    });
}

async fn sleep_off_main_thread(duration: Duration) {
    let _ = tauri::async_runtime::spawn_blocking(move || std::thread::sleep(duration)).await;
}

fn tell<R: Runtime>(app: &AppHandle<R>, kind: MessageDialogKind, title: &str, message: String) {
    let mut dialog = app.dialog().message(message).title(title).kind(kind);
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.parent(&window);
    }
    dialog.blocking_show();
}

/// Looks for a newer Etch and offers to install it. `asked` is true when the
/// user chose Check for Updates…, so they also hear "you're up to date" and
/// about failures; the background check stays quiet unless there is news.
pub async fn check<R: Runtime>(app: AppHandle<R>, asked: bool) {
    let result = match app.updater() {
        Ok(updater) => updater.check().await,
        Err(error) => Err(error),
    };
    mark_checked(&app);
    let update = match result {
        Ok(Some(update)) => update,
        Ok(None) => {
            if asked {
                let version = app.package_info().version.to_string();
                tell(&app, MessageDialogKind::Info, "Etch is up to date", format!("You have the latest version of Etch ({version})."));
            }
            return;
        }
        Err(error) => {
            eprintln!("Etch: update check failed: {error}");
            if asked {
                tell(&app, MessageDialogKind::Warning, "Couldn't check for updates", "Etch couldn't get update information right now. If you're offline, connect to the internet and try again later. Your current version keeps working.".into());
            }
            return;
        }
    };

    let mut question = app
        .dialog()
        .message(format!(
            "Etch {} is available. You have {}.\n\nSave your project first: installing restarts Etch, and unsaved edits will be lost.",
            update.version, update.current_version
        ))
        .title("A new version of Etch is ready")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom("Install and Restart".into(), "Later".into()));
    if let Some(window) = app.get_webview_window("main") {
        question = question.parent(&window);
    }
    if !question.blocking_show() {
        return;
    }

    match update.download_and_install(|_, _| {}, || {}).await {
        Ok(()) => app.restart(),
        Err(error) => {
            eprintln!("Etch: update install failed: {error}");
            tell(&app, MessageDialogKind::Error, "The update didn't install", format!("Etch couldn't install the update ({error}). Your current version still works. Try again later from Etch → Check for Updates…."));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::is_due;

    #[test]
    fn checks_at_most_once_a_day() {
        let day = 24 * 60 * 60;
        assert!(is_due(0, 1_000_000));
        assert!(!is_due(1_000_000, 1_000_000 + day - 1));
        assert!(is_due(1_000_000, 1_000_000 + day));
        // A clock moved backwards never triggers a check storm.
        assert!(!is_due(2_000_000, 1_000_000));
    }
}
