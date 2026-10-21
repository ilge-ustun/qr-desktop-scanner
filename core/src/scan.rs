//! One scan, from permission check to result. The platform supplies the
//! permission check and the capture; everything else is here so it can be
//! tested with fakes.

use std::path::Path;

use serde::Serialize;

use crate::decode::{DecodedCode, Decoder};

/// What a scan ended with; sent to the UI as the `scan://result` event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ScanOutcome {
    Found { codes: Vec<DecodedCode> },
    NotFound,
    Cancelled,
    PermissionDenied,
    Error { message: String },
}

pub trait ScreenPermission {
    fn granted(&self) -> bool;
}

#[derive(Debug, PartialEq, Eq)]
pub enum Capture {
    /// An image of the selection was written to the destination.
    Taken,
    /// The user pressed Esc, or nothing was written.
    Cancelled,
}

pub trait Capturer {
    /// Let the user select a region and write it to `dest` as an image.
    fn capture(&self, dest: &Path) -> Result<Capture, String>;
}

/// Run one scan. The screenshot lives in a temporary directory under
/// `scratch` that is removed when this returns, whatever the outcome.
pub fn run_scan(
    permission: &dyn ScreenPermission,
    capturer: &dyn Capturer,
    decoder: &dyn Decoder,
    scratch: &Path,
) -> ScanOutcome {
    if !permission.granted() {
        return ScanOutcome::PermissionDenied;
    }
    let dir = match tempfile::Builder::new().prefix("scan-").tempdir_in(scratch) {
        Ok(dir) => dir,
        Err(e) => return error(format!("could not create a temporary directory: {e}")),
    };
    let shot = dir.path().join("selection.png");

    match capturer.capture(&shot) {
        Ok(Capture::Taken) => {}
        Ok(Capture::Cancelled) => return ScanOutcome::Cancelled,
        Err(e) => return error(e),
    }
    // screencapture exits 0 and writes nothing when the user presses Esc.
    if !shot.is_file() {
        return ScanOutcome::Cancelled;
    }
    let image = match image::open(&shot) {
        Ok(image) => image,
        Err(e) => return error(format!("could not read the screenshot: {e}")),
    };
    let codes = decoder.decode(&image);
    if codes.is_empty() {
        ScanOutcome::NotFound
    } else {
        ScanOutcome::Found { codes }
    }
}

fn error(message: String) -> ScanOutcome {
    ScanOutcome::Error { message }
}
