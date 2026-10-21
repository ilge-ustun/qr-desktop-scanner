//! The menu-bar icon: left click toggles the popover, right click opens a menu.

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Wry};

use crate::{popover, scan};

/// Returns the Scan menu item, whose shortcut label follows the user's choice.
pub fn create(app: &AppHandle) -> tauri::Result<MenuItem<Wry>> {
    let scan_item = MenuItem::with_id(app, "scan", "Scan QR Code", true, None::<&str>)?;
    let find_all = MenuItem::with_id(
        app,
        "find_all",
        "Find All Codes on Screen",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit QR Scanner", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &scan_item,
            &find_all,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("main")
        // A template image: macOS tints it for light and dark menu bars. The
        // pixel "QR" of the app icon, drawn on Silkscreen's own grid at 5 px
        // per font pixel, 36 px tall: tray-icon shows it 18 pt tall, so
        // every pixel lands exactly on a Retina pixel.
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("QR Scanner")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "scan" => scan::spawn(app.clone()),
            "find_all" => scan::spawn_find_all(app.clone()),
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
    Ok(scan_item)
}
