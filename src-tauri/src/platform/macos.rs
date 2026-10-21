use std::path::{Path, PathBuf};
use std::process::Command;

use qr_core::{Capture, Capturer, DisplaysCapturer, ScreenPermission};

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

/// Every display at once, as Cmd-Shift-3 takes them: one image each.
pub struct ScreencaptureDisplays;

impl DisplaysCapturer for ScreencaptureDisplays {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        let shots: Vec<PathBuf> = (1..=active_displays()?)
            .map(|n| dir.join(format!("display-{n}.png")))
            .collect();
        // No -i: no selection. Given one file per display, screencapture
        // writes them in order, the main display first. -x: no shutter sound.
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
    match (err, count) {
        (0, 0) => Err("no display is active".into()),
        (0, count) => Ok(count),
        (err, _) => Err(format!(
            "could not list the displays: CoreGraphics error {err}"
        )),
    }
}

const NETWORKSETUP: &str = "/usr/sbin/networksetup";

/// Joins a Wi-Fi network the way System Settings does. Blocks for as long as
/// the join takes (seconds), so call it off the main thread.
pub fn join_wifi(ssid: &str, password: Option<&str>) -> Result<(), String> {
    let ports = Command::new(NETWORKSETUP)
        .arg("-listallhardwareports")
        .output()
        .map_err(|e| format!("could not run networksetup: {e}"))?;
    let device = qr_core::wifi::wifi_device(&String::from_utf8_lossy(&ports.stdout))
        .ok_or("this Mac has no Wi-Fi interface")?;

    // Arguments, not a shell line: nothing in the code is interpreted. The
    // password is briefly visible to other processes of this user in `ps`.
    let mut join = Command::new(NETWORKSETUP);
    join.args(["-setairportnetwork", &device, ssid]);
    if let Some(password) = password.filter(|p| !p.is_empty()) {
        join.arg(password);
    }
    let out = join
        .output()
        .map_err(|e| format!("could not run networksetup: {e}"))?;

    // networksetup reports a failed join on stdout and still exits 0; on
    // success it prints nothing.
    let said = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    let said = said.trim();
    if out.status.success() && said.is_empty() {
        Ok(())
    } else if said.is_empty() {
        Err(format!("networksetup failed: {}", out.status))
    } else {
        Err(said.lines().next().unwrap_or(said).to_owned())
    }
}
