use std::path::{Path, PathBuf};
use std::process::Command;

use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use qr_core::{capture, wifi, window, Capture, Capturer, DisplaysCapturer, ScreenPermission};
use tauri::WebviewWindow;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;
    fn CGGetActiveDisplayList(
        max_displays: u32,
        active_displays: *mut u32,
        display_count: *mut u32,
    ) -> i32;
}

/// Without Screen Recording permission screencapture does not fail: it
/// returns the wallpaper with every window missing. So the app asks first.
pub struct Permission;

impl ScreenPermission for Permission {
    fn granted(&self) -> bool {
        // SAFETY: no arguments, no preconditions; available since macOS 10.15.
        unsafe { CGPreflightScreenCaptureAccess() }
    }
}

/// Puts the app in System Settings' Screen Recording list and, the first
/// time, shows the system prompt. A grant takes effect after a relaunch.
pub fn request_permission() {
    // SAFETY: as above.
    unsafe {
        CGRequestScreenCaptureAccess();
    }
}

pub fn open_screen_settings() -> Result<(), String> {
    // output(), not status(): what `open` writes to stderr says why it failed.
    let out = Command::new("/usr/bin/open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
        .output()
        .map_err(|e| format!("could not open System Settings: {e}"))?;
    capture::open_settings_result(
        out.status.success(),
        &out.status.to_string(),
        &String::from_utf8_lossy(&out.stderr),
    )
}

/// The system's own Cmd-Shift-4 crosshair.
pub struct Screencapture;

impl Capturer for Screencapture {
    fn capture(&self, dest: &Path) -> Result<Capture, String> {
        // -i: interactive selection (space switches to picking a window),
        // -x: no shutter sound.
        let status = Command::new("/usr/sbin/screencapture")
            .args(["-i", "-x"])
            .arg(dest)
            .status()
            .map_err(|e| format!("could not run screencapture: {e}"))?;
        capture::selection_verdict(dest.is_file(), status.code(), &status.to_string())
    }
}

/// Every display at once, as Cmd-Shift-3 takes them: one image each.
pub struct ScreencaptureDisplays;

impl DisplaysCapturer for ScreencaptureDisplays {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        let shots = capture::display_files(dir, active_displays()?);
        // No -i: no selection. -x: no shutter sound.
        let status = Command::new("/usr/sbin/screencapture")
            .arg("-x")
            .args(&shots)
            .status()
            .map_err(|e| format!("could not run screencapture: {e}"))?;
        if status.success() {
            Ok(shots)
        } else {
            Err(format!("screencapture failed: {status}"))
        }
    }
}

fn active_displays() -> Result<u32, String> {
    let mut count = 0;
    // SAFETY: with no list (null, room for none), CoreGraphics only writes
    // the number of active displays to `count`.
    let err = unsafe { CGGetActiveDisplayList(0, std::ptr::null_mut(), &mut count) };
    capture::display_count(err, count)
}

/// Lets the popover show over an app in full screen, in that app's Space,
/// and on every other Space. qr_core::window says which bits; this only
/// reads them from the NSWindow and writes them back. Call it on the main
/// thread. If the window has no NSWindow, nothing changes.
pub fn join_full_screen_spaces(popover: &WebviewWindow) {
    let Ok(ns_window) = popover.ns_window() else {
        return;
    };
    // SAFETY: ns_window() gives the window's NSWindow, autoreleased, so it
    // lives until the event loop's pool drains, after this call; as_ref()
    // turns null into None. The caller is on the main thread, as AppKit
    // wants for every NSWindow call.
    let Some(ns_window) = (unsafe { ns_window.cast::<NSWindow>().as_ref() }) else {
        return;
    };
    let current = ns_window.collectionBehavior().0 as u64;
    let bits = window::popover_collection_behavior(current) as usize;
    ns_window.setCollectionBehavior(NSWindowCollectionBehavior(bits));
}

const NETWORKSETUP: &str = "/usr/sbin/networksetup";

/// Joins a Wi-Fi network the way System Settings does. Blocks for as long as
/// the join takes (seconds), so call it off the main thread.
pub fn join_wifi(ssid: &str, password: Option<&str>) -> Result<(), String> {
    let ports = Command::new(NETWORKSETUP)
        .arg("-listallhardwareports")
        .output()
        .map_err(|e| format!("could not run networksetup: {e}"))?;
    let device = wifi::wifi_device(&String::from_utf8_lossy(&ports.stdout))
        .ok_or("this Mac has no Wi-Fi interface")?;

    let out = Command::new(NETWORKSETUP)
        .args(wifi::join_args(&device, ssid, password))
        .output()
        .map_err(|e| format!("could not run networksetup: {e}"))?;
    wifi::join_result(
        out.status.success(),
        &out.status.to_string(),
        &String::from_utf8_lossy(&out.stdout),
        &String::from_utf8_lossy(&out.stderr),
    )
}
