use std::path::{Path, PathBuf};
use std::process::Command;

use qr_core::{capture, wifi, Capture, Capturer, DisplaysCapturer, ScreenPermission};

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
