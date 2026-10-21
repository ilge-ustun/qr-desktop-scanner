//! One scan, from permission check to result. The platform supplies the
//! permission check and the capture; everything else is here so it can be
//! tested with fakes.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tempfile::TempDir;

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

/// Which kind of scan is running; sent to the UI as the `scan://started`
/// event, so it can word the result.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    /// The region the user drags a box around ([`run_scan`]).
    Area,
    /// Every display at once ([`run_find_all`]).
    Screen,
}

pub trait DisplaysCapturer {
    /// Write an image of each display into `dir`, and nowhere else, and
    /// return their paths, the main display first.
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String>;
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
    let dir = match temp_dir(scratch) {
        Ok(dir) => dir,
        Err(outcome) => return outcome,
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
    found(decoder.decode(&image))
}

/// Find every code on every display, with no selection to make. A code seen
/// on several displays is reported once, where it first appears. As for
/// [`run_scan`], the screenshots live in a temporary directory under
/// `scratch` that is removed when this returns, whatever the outcome.
pub fn run_find_all(
    permission: &dyn ScreenPermission,
    capturer: &dyn DisplaysCapturer,
    decoder: &dyn Decoder,
    scratch: &Path,
) -> ScanOutcome {
    if !permission.granted() {
        return ScanOutcome::PermissionDenied;
    }
    let dir = match temp_dir(scratch) {
        Ok(dir) => dir,
        Err(outcome) => return outcome,
    };
    let shots = match capturer.capture_displays(dir.path()) {
        Ok(shots) => shots,
        Err(e) => return error(e),
    };
    // A display with no image (one mirroring another, say) is skipped. No
    // image at all is a failure, never a cancel: there was no selection.
    let shots: Vec<PathBuf> = shots.into_iter().filter(|shot| shot.is_file()).collect();
    if shots.is_empty() {
        return error("no screenshot was written".into());
    }
    let mut seen = HashSet::new();
    let mut codes = Vec::new();
    for shot in &shots {
        let image = match image::open(shot) {
            Ok(image) => image,
            Err(e) => return error(format!("could not read the screenshot: {e}")),
        };
        // The decoder dedups within one image; this does it across them.
        let new = decoder.decode(&image).into_iter();
        codes.extend(new.filter(|code| seen.insert(code.text.clone())));
    }
    found(codes)
}

fn temp_dir(scratch: &Path) -> Result<TempDir, ScanOutcome> {
    tempfile::Builder::new()
        .prefix("scan-")
        .tempdir_in(scratch)
        .map_err(|e| error(format!("could not create a temporary directory: {e}")))
}

fn found(codes: Vec<DecodedCode>) -> ScanOutcome {
    if codes.is_empty() {
        ScanOutcome::NotFound
    } else {
        ScanOutcome::Found { codes }
    }
}

fn error(message: String) -> ScanOutcome {
    ScanOutcome::Error { message }
}
