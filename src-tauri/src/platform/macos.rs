use std::path::Path;
use std::process::Command;

use qr_core::{Capture, Capturer, ScreenPermission};

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;
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
    Command::new("/usr/bin/open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
        .status()
        .map_err(|e| format!("could not open System Settings: {e}"))
        .map(|_| ())
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
        if dest.is_file() {
            Ok(Capture::Taken)
        } else if status.success() || status.code() == Some(1) {
            // Esc: nothing written, exit 0 or 1 depending on the macOS version.
            Ok(Capture::Cancelled)
        } else {
            Err(format!("screencapture failed: {status}"))
        }
    }
}
