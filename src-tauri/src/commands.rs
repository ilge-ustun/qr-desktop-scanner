//! What the webview may call. Everything that touches the OS is decided here,
//! not in the page.

use qr_core::{check_openable, ScreenPermission};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::{platform, popover, scan};

/// Starts a scan; the result arrives as the `scan://result` event, the same
/// way as for a scan started by the hotkey or the tray menu.
#[tauri::command]
pub fn start_scan(app: AppHandle) {
    scan::spawn(app);
}

#[tauri::command]
pub fn screen_permission() -> bool {
    platform::Permission.granted()
}

/// Asks for access first: macOS lists an app under Screen Recording only after
/// it has asked, so opening the pane alone shows nothing to switch on.
#[tauri::command]
pub fn open_screen_settings() -> Result<(), String> {
    platform::request_permission();
    platform::open_screen_settings()
}

/// Opens a decoded link in the default app, after checking its scheme again:
/// the page offers Open only for safe schemes, and this holds even if it did not.
#[tauri::command]
pub fn open_link(app: AppHandle, url: String) -> Result<(), String> {
    let url = check_openable(&url).map_err(|e| e.to_string())?;
    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|e| e.to_string())?;
    popover::hide(&app);
    Ok(())
}

#[tauri::command]
pub fn hide_popover(app: AppHandle) {
    popover::hide(&app);
}
