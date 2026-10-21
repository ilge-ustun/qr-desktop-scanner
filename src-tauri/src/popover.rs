//! The one window, shown under the tray icon like a menu-bar popover.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, LogicalSize, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_positioner::{Position, WindowExt};

/// Clicking the tray icon while the popover is open first blurs the window,
/// which hides it, and then delivers the click, which would show it again.
/// A click this soon after a hide is that same click and is ignored.
const CLICK_AFTER_BLUR: Duration = Duration::from_millis(300);

/// The popover's width, as in tauri.conf.json, and the bounds of its height.
/// Taller content scrolls inside the window.
const WIDTH: f64 = 360.0;
const MIN_HEIGHT: f64 = 120.0;
const MAX_HEIGHT: f64 = 640.0;

#[derive(Default)]
pub struct Popover {
    last_hidden: Mutex<Option<Instant>>,
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

/// Under the tray icon. The tray position is known only after the first tray
/// event; before that (a scan started by the hotkey) the top right instead.
fn place(window: &WebviewWindow) {
    if window.move_window(Position::TrayCenter).is_err() {
        let _ = window.move_window(Position::TopRight);
    }
}

pub fn show(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    place(&window);
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn fit(app: &AppHandle, height: f64) {
    let Some(window) = window(app) else { return };
    let height = height.clamp(MIN_HEIGHT, MAX_HEIGHT);
    let _ = window.set_size(LogicalSize::new(WIDTH, height));
    // Resizing keeps a corner fixed; placing again keeps the top under the icon.
    place(&window);
}

pub fn hide(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    let _ = window.hide();
    *app.state::<Popover>().last_hidden.lock().unwrap() = Some(Instant::now());
}

pub fn toggle(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    if window.is_visible().unwrap_or(false) {
        hide(app);
        return;
    }
    let just_hidden = app
        .state::<Popover>()
        .last_hidden
        .lock()
        .unwrap()
        .is_some_and(|at| at.elapsed() < CLICK_AFTER_BLUR);
    if !just_hidden {
        show(app);
    }
}

/// Clicking anywhere else closes the popover, as a menu would.
pub fn hide_on_blur(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    let app = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            hide(&app);
        }
    });
}
