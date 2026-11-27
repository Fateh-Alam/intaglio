//! The macOS menu bar.
//!
//! Every custom item's id is an editor command id (see `appCommands` in
//! `app/editor/hooks/useEditorState.tsx` and `app/editor/shell/useShellCommands.ts`).
//! Choosing an item emits [`MENU_EVENT`] with that id, and the editor runs the
//! same command the command bar and keyboard shortcuts run.
//!
//! Only ⌘-combinations get accelerators. A bare key like `\` or `J` in a menu
//! would fire while someone types in a text field; those shortcuts stay in the
//! page and are listed under Help → Keyboard Shortcuts.

use tauri::menu::{AboutMetadataBuilder, Menu, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub const MENU_EVENT: &str = "etch:menu";

/// Ids the editor handles that aren't commands in the command bar.
pub const UNDO: &str = "undo";
pub const REDO: &str = "redo";
pub const COMMAND_BAR: &str = "command-bar";

/// Developer-only test page for the native viewport (D2 spike). The Help menu
/// shows it only when Etch is launched with `ETCH_DEVELOPER=1`.
pub const NATIVE_VIEWPORT_TEST: &str = "dev-native-viewport";

pub fn open_native_viewport_test<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else { return };
    if let Ok(url) = window.url().and_then(|current| current.join("/native-viewport/").map_err(|error| tauri::Error::Anyhow(error.into()))) {
        let _ = window.navigate(url);
    }
}

fn item<R: Runtime>(app: &AppHandle<R>, id: &str, label: &str, accelerator: Option<&str>) -> tauri::Result<tauri::menu::MenuItem<R>> {
    let builder = MenuItemBuilder::with_id(id, label);
    match accelerator {
        Some(keys) => builder.accelerator(keys).build(app),
        None => builder.build(app),
    }
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = AboutMetadataBuilder::new()
        .name(Some("Etch"))
        .version(Some(app.package_info().version.to_string()))
        .comments(Some("A precision-machined digital darkroom."))
        .build();

    let app_menu = SubmenuBuilder::new(app, "Etch")
        .about(Some(about))
        .item(&item(app, crate::updates::MENU_ID, "Check for Updates…", None)?)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file = SubmenuBuilder::new(app, "File")
        .item(&item(app, "open-library", "Open Library", None)?)
        .item(&item(app, "open-image", "Open Photograph…", Some("CmdOrCtrl+O"))?)
        .item(&item(app, "load-project-session", "Open Project…", Some("CmdOrCtrl+Shift+O"))?)
        .item(&SubmenuBuilder::with_id(app, crate::recent::SUBMENU_ID, "Open Recent").build()?)
        .separator()
        .item(&item(app, "save-project-session", "Save Project", Some("CmdOrCtrl+S"))?)
        .item(&item(app, "create-preset", "Save Look as Recipe…", None)?)
        .item(&item(app, "apply-look", "Apply Look…", None)?)
        .separator()
        .item(&item(app, "export-image", "Export…", Some("CmdOrCtrl+E"))?)
        .item(&item(app, "batch-export", "Batch Export…", None)?)
        .item(&item(app, "export-video", "Export Video…", None)?)
        .separator()
        .close_window()
        .build()?;

    let edit = SubmenuBuilder::new(app, "Edit")
        .item(&item(app, UNDO, "Undo", Some("CmdOrCtrl+Z"))?)
        .item(&item(app, REDO, "Redo", Some("CmdOrCtrl+Shift+Z"))?)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&item(app, "copy-settings", "Copy Edit Settings", Some("CmdOrCtrl+Shift+C"))?)
        .item(&item(app, "paste-settings", "Paste Edit Settings", Some("CmdOrCtrl+Shift+V"))?)
        .item(&item(app, "create-virtual-copy", "Create Virtual Copy", None)?)
        .build()?;

    let photo = SubmenuBuilder::new(app, "Photo")
        .item(&item(app, "view-crop", "Crop & Straighten", None)?)
        .separator()
        .item(&item(app, "rate-five", "Rate 5 Stars", None)?)
        .item(&item(app, "clear-rating", "Clear Rating", None)?)
        .separator()
        .item(&item(app, "mark-picked", "Pick", None)?)
        .item(&item(app, "mark-rejected", "Reject", None)?)
        .item(&item(app, "clear-flag", "Clear Flag", None)?)
        .build()?;

    let view = SubmenuBuilder::new(app, "View")
        .item(&item(app, "view-before", "Before / After", None)?)
        .item(&item(app, "view-split", "Before / After Split", None)?)
        .item(&item(app, "view-clipping", "Show Clipping", None)?)
        .item(&item(app, "view-histogram", "Show Histogram", None)?)
        .separator()
        .item(&item(app, "panel-edit", "Edit Whole Photo", None)?)
        .item(&item(app, "panel-masks", "Masks", None)?)
        .item(&item(app, "panel-text", "Titles & Watermark", None)?)
        .item(&item(app, "panel-grade", "Grade", None)?)
        .item(&item(app, "panel-effects", "Browse Effects", None)?)
        .item(&item(app, "panel-looks", "Browse Looks", None)?)
        .item(&item(app, "panel-history", "History", None)?)
        .separator()
        .item(&item(app, "view-panels", "Hide Panels", None)?)
        .fullscreen()
        .build()?;

    let window = SubmenuBuilder::new(app, "Window").minimize().maximize().build()?;

    let mut help = SubmenuBuilder::new(app, "Help")
        .item(&item(app, COMMAND_BAR, "Search Commands…", Some("CmdOrCtrl+K"))?)
        .item(&item(app, "show-shortcuts", "Keyboard Shortcuts", None)?);
    if std::env::var_os("ETCH_DEVELOPER").is_some() {
        help = help.separator().item(&item(app, NATIVE_VIEWPORT_TEST, "Developer: Native Viewport Test", None)?);
    }
    let help = help.build()?;

    Menu::with_items(app, &[&app_menu, &file, &edit, &photo, &view, &window, &help])
}

/// Forwards a chosen menu item to the editor.
pub fn forward<R: Runtime>(app: &AppHandle<R>, id: &str) {
    if let Err(error) = app.emit(MENU_EVENT, id) {
        eprintln!("Etch: could not forward menu item {id}: {error}");
    }
}
