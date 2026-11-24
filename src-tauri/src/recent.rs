//! File → Open Recent.
//!
//! Remembers the last photos and projects opened (and projects saved), keeps
//! them in the app's data folder, and mirrors them in the menu. Choosing one
//! sends it down the same path as a Finder double-click.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::menu::{IsMenuItem, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager, Runtime};

pub const SUBMENU_ID: &str = "open-recent";
const ITEM_PREFIX: &str = "recent:";
const CLEAR_ID: &str = "recent:clear";
const MAX_RECENT: usize = 10;

pub struct Recents {
    list: Mutex<Vec<PathBuf>>,
    store: Option<PathBuf>,
}

impl Recents {
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Self {
        let store = app.path().app_data_dir().ok().map(|dir| dir.join("recent.json"));
        let list = store
            .as_deref()
            .and_then(|path| std::fs::read(path).ok())
            .and_then(|bytes| serde_json::from_slice::<Vec<PathBuf>>(&bytes).ok())
            .unwrap_or_default();
        Self { list: Mutex::new(list), store }
    }

    fn save(&self, list: &[PathBuf]) {
        let Some(store) = &self.store else { return };
        if let Some(dir) = store.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_vec_pretty(list) {
            let _ = std::fs::write(store, json);
        }
    }
}

/// The saved list, loaded on first use. macOS can hand Etch a file on a cold
/// start before the app's setup hook has run, so this can't wait for setup.
pub fn ensure<R: Runtime>(app: &AppHandle<R>) -> tauri::State<'_, Recents> {
    if app.try_state::<Recents>().is_none() {
        app.manage(Recents::load(app));
    }
    app.state::<Recents>()
}

/// Moves `path` to the top of Open Recent.
pub fn remember<R: Runtime>(app: &AppHandle<R>, path: &Path) {
    let recents = ensure(app);
    {
        let mut list = recents.list.lock().unwrap();
        push_front(&mut list, path);
        recents.save(&list);
    }
    refresh_menu(app);
}

fn push_front(list: &mut Vec<PathBuf>, path: &Path) {
    list.retain(|existing| existing != path);
    list.insert(0, path.to_path_buf());
    list.truncate(MAX_RECENT);
}

/// Handles an Open Recent menu item. Returns `false` if `id` isn't one.
pub fn handle_menu<R: Runtime>(app: &AppHandle<R>, id: &str) -> bool {
    let Some(index) = id.strip_prefix(ITEM_PREFIX) else { return false };
    let recents = ensure(app);
    if id == CLEAR_ID {
        let mut list = recents.list.lock().unwrap();
        list.clear();
        recents.save(&list);
    } else if let Ok(index) = index.parse::<usize>() {
        let path = recents.list.lock().unwrap().get(index).cloned();
        if let Some(path) = path {
            if path.is_file() {
                crate::opened_files::receive(app, vec![path]);
                return true;
            }
            // Moved or deleted since: drop it, as macOS does.
            let mut list = recents.list.lock().unwrap();
            list.retain(|existing| existing != &path);
            recents.save(&list);
        }
    }
    refresh_menu(app);
    true
}

fn find_submenu<R: Runtime>(app: &AppHandle<R>) -> Option<Submenu<R>> {
    let menu = app.menu()?;
    menu.items().ok()?.into_iter().find_map(|item| match item {
        MenuItemKind::Submenu(submenu) => match submenu.get(SUBMENU_ID) {
            Some(MenuItemKind::Submenu(found)) => Some(found),
            _ => None,
        },
        _ => None,
    })
}

fn label(path: &Path) -> String {
    let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    match path.parent().and_then(|parent| parent.file_name()) {
        Some(folder) => format!("{name} — {}", folder.to_string_lossy()),
        None => name,
    }
}

/// Rebuilds the Open Recent submenu from the saved list.
pub fn refresh_menu<R: Runtime>(app: &AppHandle<R>) {
    let Some(submenu) = find_submenu(app) else { return };
    let saved: Vec<PathBuf> = ensure(app).list.lock().unwrap().clone();
    if let Err(error) = rebuild(app, &submenu, &saved) {
        eprintln!("Etch: could not update Open Recent: {error}");
    }
}

/// Item ids are positions in the saved list; files that no longer exist are hidden.
fn rebuild<R: Runtime>(app: &AppHandle<R>, submenu: &Submenu<R>, saved: &[PathBuf]) -> tauri::Result<()> {
    while submenu.remove_at(0)?.is_some() {}
    let mut items: Vec<Box<dyn IsMenuItem<R>>> = Vec::new();
    for (index, path) in saved.iter().enumerate().filter(|(_, path)| path.exists()) {
        items.push(Box::new(MenuItem::with_id(app, format!("{ITEM_PREFIX}{index}"), label(path), true, None::<&str>)?));
    }
    let any = !items.is_empty();
    if !any {
        items.push(Box::new(MenuItem::with_id(app, "recent:none", "No Recent Files", false, None::<&str>)?));
    }
    items.push(Box::new(PredefinedMenuItem::separator(app)?));
    items.push(Box::new(MenuItem::with_id(app, CLEAR_ID, "Clear Menu", any, None::<&str>)?));
    let refs: Vec<&dyn IsMenuItem<R>> = items.iter().map(|item| item.as_ref()).collect();
    submenu.append_items(&refs)
}

#[cfg(test)]
mod tests {
    use super::{label, push_front, MAX_RECENT};
    use std::path::{Path, PathBuf};

    #[test]
    fn newest_first_without_duplicates_and_capped() {
        let mut list: Vec<PathBuf> = Vec::new();
        for index in 0..12 {
            push_front(&mut list, Path::new(&format!("/photos/{index}.jpg")));
        }
        push_front(&mut list, Path::new("/photos/5.jpg"));
        assert_eq!(list.len(), MAX_RECENT);
        assert_eq!(list[0], Path::new("/photos/5.jpg"));
        assert_eq!(list.iter().filter(|path| path.ends_with("5.jpg")).count(), 1);
    }

    #[test]
    fn labels_show_the_folder() {
        assert_eq!(label(Path::new("/Users/a/Trips/Rome.etch")), "Rome.etch — Trips");
    }
}
