use std::path::Path;

use qr_core::{Capture, Capturer, ScreenPermission};

const UNSUPPORTED: &str = "screen capture is implemented for macOS only";

pub struct Permission;

impl ScreenPermission for Permission {
    fn granted(&self) -> bool {
        true
    }
}

pub fn request_permission() {}

pub fn open_screen_settings() -> Result<(), String> {
    Err(UNSUPPORTED.into())
}

pub struct Screencapture;

impl Capturer for Screencapture {
    fn capture(&self, _: &Path) -> Result<Capture, String> {
        Err(UNSUPPORTED.into())
    }
}
