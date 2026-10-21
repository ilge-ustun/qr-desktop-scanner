//! The menu-bar icon: left click toggles the popover, right click opens a menu.

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;

use crate::{popover, scan};

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let scan_item =
        MenuItem::with_id(app, "scan", "Scan QR Code", true, Some("CmdOrCtrl+Shift+2"))?;
    let quit = MenuItem::with_id(app, "quit", "Quit QR Scanner", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&scan_item, &PredefinedMenuItem::separator(app)?, &quit],
    )?;

    TrayIconBuilder::with_id("main")
        // A template image: macOS tints it for light and dark menu bars.
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("QR Scanner")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "scan" => scan::spawn(app.clone()),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                popover::toggle(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
