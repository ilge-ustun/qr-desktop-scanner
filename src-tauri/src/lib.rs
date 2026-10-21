//! The Tauri shell: tray icon, popover window, hotkey and IPC. The logic is in
//! `qr-core`; this crate wires it to the platform.

mod commands;
mod hotkey;
mod platform;
mod popover;
mod scan;
mod tray;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

pub fn run() {
    // Whatever shortcut is registered (hotkey.rs decides which) starts a scan.
    let shortcuts = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _, event| {
            if event.state() == ShortcutState::Pressed {
                scan::spawn(app.clone());
            }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(shortcuts)
        .manage(scan::ScanState::default())
        .manage(popover::Popover::default())
        .invoke_handler(tauri::generate_handler![
            commands::start_scan,
            commands::find_all_on_screen,
            commands::screen_permission,
            commands::open_screen_settings,
            commands::open_link,
            commands::hide_popover,
            commands::fit_popover,
            commands::join_wifi,
            commands::get_hotkey,
            commands::suspend_hotkey,
            commands::resume_hotkey,
            commands::set_hotkey,
        ])
        .setup(|app| {
            // A menu-bar app: no Dock icon, no entry in the app switcher.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let scan_item = tray::create(app.handle())?;
            app.manage(hotkey::Hotkey::new(scan_item));
            hotkey::register_saved(app.handle());
            popover::hide_on_blur(app.handle());
            // Open once at launch, so it is clear where the app lives.
            popover::show(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running QR Scanner");
}
