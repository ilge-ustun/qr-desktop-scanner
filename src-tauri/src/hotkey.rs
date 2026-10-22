//! The global scan shortcut. The user picks it in the popover; it is kept in
//! settings.json in the app's config directory and registered again at launch.

use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::MenuItem;
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use crate::error::Error;

/// ⌘⇧2: beside the system's screenshot keys (⌘⇧3/4/5), and unused by macOS.
/// ⌥⇧Q, the first choice, closed windows on the human's Mac.
fn default_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Digit2)
}

/// The shortcut in force, and the tray menu item that shows it.
pub struct Hotkey {
    current: Mutex<Option<Shortcut>>,
    menu_item: MenuItem<Wry>,
}

impl Hotkey {
    pub fn new(menu_item: MenuItem<Wry>) -> Self {
        Self {
            current: Mutex::new(None),
            menu_item,
        }
    }
}

#[derive(Default, Serialize, Deserialize)]
struct Settings {
    hotkey: Option<String>,
}

fn settings_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("settings.json"))
}

fn load(app: &AppHandle) -> Settings {
    settings_path(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save(app: &AppHandle, settings: &Settings) -> Result<(), Error> {
    let path = settings_path(app).ok_or("no config directory")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let text = serde_json::to_string_pretty(settings)?;
    std::fs::write(path, text)?;
    Ok(())
}

fn set_current(app: &AppHandle, shortcut: Option<Shortcut>) {
    let state = app.state::<Hotkey>();
    *state.current.lock().unwrap() = shortcut;
    let _ = state
        .menu_item
        .set_accelerator(shortcut.map(Shortcut::into_string));
}

/// At launch: the saved shortcut, or ⌘⇧2 when there is none or it is taken.
pub fn register_saved(app: &AppHandle) {
    let saved = load(app)
        .hotkey
        .and_then(|text| text.parse::<Shortcut>().ok());
    for candidate in saved.into_iter().chain([default_shortcut()]) {
        if app.global_shortcut().register(candidate).is_ok() {
            set_current(app, Some(candidate));
            return;
        }
    }
    set_current(app, None);
}

/// The shortcut in force, as `shift+super+Digit2`; None when none could be
/// registered.
pub fn current(app: &AppHandle) -> Option<String> {
    app.state::<Hotkey>()
        .current
        .lock()
        .unwrap()
        .map(Shortcut::into_string)
}

/// While the user records a new shortcut, pressing the old one must not scan.
pub fn suspend(app: &AppHandle) {
    let _ = app.global_shortcut().unregister_all();
}

pub fn resume(app: &AppHandle) {
    let current = *app.state::<Hotkey>().current.lock().unwrap();
    if let Some(shortcut) = current {
        let _ = app.global_shortcut().register(shortcut);
    }
}

/// Switches to `accelerator` and saves it. On failure, a failed save too,
/// the previous shortcut stays in force.
pub fn change(app: &AppHandle, accelerator: &str) -> Result<String, Error> {
    let shortcut: Shortcut = accelerator
        .parse()
        .map_err(|_| "That key can't be part of a shortcut.")?;
    // Shift alone is just typing a capital letter.
    if !shortcut
        .mods
        .intersects(Modifiers::SUPER | Modifiers::CONTROL | Modifiers::ALT)
    {
        return Err("Use ⌘, ⌃ or ⌥ in the shortcut.".into());
    }
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    if shortcuts.register(shortcut).is_err() {
        resume(app);
        return Err("Another app already uses that shortcut.".into());
    }
    let text = shortcut.into_string();
    // A shortcut that is not saved is gone at the next launch, which takes
    // back the saved one without a word. So it does not replace the one in
    // force: that one is registered again, and the user is told.
    if let Err(error) = save(
        app,
        &Settings {
            hotkey: Some(text.clone()),
        },
    ) {
        let _ = shortcuts.unregister(shortcut);
        resume(app);
        return Err(Error::NotSaved(Box::new(error)));
    }
    set_current(app, Some(shortcut));
    Ok(text)
}
