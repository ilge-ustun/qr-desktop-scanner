//! What the webview may call. Everything that touches the OS is decided here,
//! not in the page.

use qr_core::{check_openable, ScreenPermission};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::error::Error;
use crate::{hotkey, platform, popover, scan};

/// Starts a scan; the result arrives as the `scan://result` event, the same
/// way as for a scan started by the hotkey or the tray menu.
#[tauri::command]
pub fn start_scan(app: AppHandle) {
    scan::spawn(app);
}

/// Finds every code on every display, with no selection; the result arrives
/// as `scan://result`, as for `start_scan`.
#[tauri::command]
pub fn find_all_on_screen(app: AppHandle) {
    scan::spawn_find_all(app);
}

#[tauri::command]
pub fn screen_permission() -> bool {
    platform::Permission.granted()
}

/// Asks for access first: macOS lists an app under Screen Recording only after
/// it has asked, so opening the pane alone shows nothing to switch on.
#[tauri::command]
pub fn open_screen_settings() -> Result<(), Error> {
    platform::request_permission();
    platform::open_screen_settings()?;
    Ok(())
}

/// Opens a decoded link in the default app, after checking its scheme again:
/// the page offers Open only for safe schemes, and this holds even if it did not.
#[tauri::command]
pub fn open_link(app: AppHandle, url: String) -> Result<(), Error> {
    let url = check_openable(&url)?;
    app.opener().open_url(url.as_str(), None::<&str>)?;
    popover::hide(&app);
    Ok(())
}

/// Joins the Wi-Fi network from a scanned code. Only the user's click on
/// Connect calls this; the name and password are checked first.
#[tauri::command]
pub async fn join_wifi(ssid: String, password: Option<String>) -> Result<(), Error> {
    qr_core::wifi::validate(&ssid, password.as_deref())?;
    tauri::async_runtime::spawn_blocking(move || platform::join_wifi(&ssid, password.as_deref()))
        .await??;
    Ok(())
}

#[tauri::command]
pub fn hide_popover(app: AppHandle) {
    popover::hide(&app);
}

/// The page reports its height; the window follows, so it is never taller
/// than what it shows.
#[tauri::command]
pub fn fit_popover(app: AppHandle, height: f64) {
    popover::fit(&app, height);
}

/// The scan shortcut, as `shift+super+Digit2`, or None when none is set.
#[tauri::command]
pub fn get_hotkey(app: AppHandle) -> Option<String> {
    hotkey::current(&app)
}

/// Recording a new shortcut: the current one stops scanning until
/// set_hotkey or resume_hotkey.
#[tauri::command]
pub fn suspend_hotkey(app: AppHandle) {
    hotkey::suspend(&app);
}

#[tauri::command]
pub fn resume_hotkey(app: AppHandle) {
    hotkey::resume(&app);
}

#[tauri::command]
pub fn set_hotkey(app: AppHandle, accelerator: String) -> Result<String, Error> {
    hotkey::change(&app, &accelerator)
}
