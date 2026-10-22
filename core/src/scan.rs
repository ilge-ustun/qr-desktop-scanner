//! One scan, from permission check to result. The platform supplies the
//! permission check and the capture; everything else is here so it can be
//! tested with fakes.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tempfile::TempDir;

use crate::decode::{DecodedCode, Decoder};

/// How the name of each scan's temporary directory under `scratch` starts.
/// [`sweep_stale`] removes what starts with it.
const SCAN_DIR_PREFIX: &str = "scan-";

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

/// What the shell does after a scan, besides sending the outcome to the
/// page.
impl ScanOutcome {
    /// The scan had no Screen Recording permission: the shell asks for it.
    pub fn asks_for_permission(&self) -> bool {
        matches!(self, ScanOutcome::PermissionDenied)
    }

    /// The popover opens again to show the outcome, except after Esc: then
    /// the user is done. A find-all never ends Cancelled.
    pub fn reopens_popover(&self) -> bool {
        !matches!(self, ScanOutcome::Cancelled)
    }
}

/// Why a scan failed. Its text is what the page shows.
#[derive(Debug, thiserror::Error)]
pub enum ScanError {
    #[error("could not create {}: {source}", .path.display())]
    Scratch {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not create a temporary directory: {0}")]
    TempDir(std::io::Error),
    #[error("{0}")]
    Capture(String),
    #[error("could not read the screenshot: {0}")]
    UnreadableImage(image::ImageError),
    #[error("no screenshot was written")]
    NoScreenshot,
}

impl From<ScanError> for ScanOutcome {
    fn from(err: ScanError) -> Self {
        ScanOutcome::Error {
            message: err.to_string(),
        }
    }
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

/// Run the scan of `scope`: [`run_scan`] with `area` for [`Scope::Area`],
/// [`run_find_all`] with `screen` for [`Scope::Screen`].
pub fn run(
    scope: Scope,
    permission: &dyn ScreenPermission,
    area: &dyn Capturer,
    screen: &dyn DisplaysCapturer,
    decoder: &dyn Decoder,
    scratch: &Path,
) -> ScanOutcome {
    match scope {
        Scope::Area => run_scan(permission, area, decoder, scratch),
        Scope::Screen => run_find_all(permission, screen, decoder, scratch),
    }
}

/// Run one scan. The screenshot lives in a temporary directory under
/// `scratch` that is removed when this returns, whatever the outcome.
/// `scratch` is created when it is missing. The directories of earlier scans
/// that the process did not live to remove are swept first
/// ([`sweep_stale`]), so only one scan may run under `scratch` at a time.
pub fn run_scan(
    permission: &dyn ScreenPermission,
    capturer: &dyn Capturer,
    decoder: &dyn Decoder,
    scratch: &Path,
) -> ScanOutcome {
    in_scan_dir(permission, scratch, |dir| {
        let shot = dir.join("selection.png");
        if capturer.capture(&shot).map_err(ScanError::Capture)? == Capture::Cancelled {
            return Ok(ScanOutcome::Cancelled);
        }
        // screencapture exits 0 and writes nothing when the user presses Esc.
        if !shot.is_file() {
            return Ok(ScanOutcome::Cancelled);
        }
        decode_shots(&[shot], decoder)
    })
}

/// Find every code on every display, with no selection to make. A code seen
/// on several displays is reported once, where it first appears. As for
/// [`run_scan`], the screenshots live in a temporary directory under
/// `scratch` that is removed when this returns, whatever the outcome,
/// `scratch` is created when it is missing, and the stale ones are swept
/// first.
pub fn run_find_all(
    permission: &dyn ScreenPermission,
    capturer: &dyn DisplaysCapturer,
    decoder: &dyn Decoder,
    scratch: &Path,
) -> ScanOutcome {
    in_scan_dir(permission, scratch, |dir| {
        let shots = capturer.capture_displays(dir).map_err(ScanError::Capture)?;
        decode_shots(&shots, decoder)
    })
}

/// Remove the scan directories that earlier scans left under `scratch`. A
/// scan's directory goes when the scan returns, but not when the process
/// ends while the scan runs (Quit, a crash, a kill): then it stays, with the
/// screenshot if one was written.
///
/// Only directories directly under `scratch` whose names start with the scan
/// prefix go. Anything else stays, and a link is never followed. Nothing
/// here fails: what cannot be read or removed is left, so a scan never fails
/// because of the sweep. It would remove a running scan's directory too, so
/// call it only when no scan runs under `scratch`.
pub fn sweep_stale(scratch: &Path) {
    let Ok(entries) = fs::read_dir(scratch) else {
        return;
    };
    // All names first, then the removals: on some file systems, removing
    // entries while the directory is read makes it skip others.
    let stale: Vec<PathBuf> = entries
        .flatten()
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with(SCAN_DIR_PREFIX)
        })
        // file_type does not follow links: a link is not a directory here.
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .map(|entry| entry.path())
        .collect();
    for dir in stale {
        // remove_dir_all removes a link inside, not what it points to.
        let _ = fs::remove_dir_all(dir);
    }
}

/// The steps before the capture, the same for both scans: the permission,
/// the sweep and the scan's directory. `scan` gets that directory, which is
/// removed when `scan` returns.
fn in_scan_dir(
    permission: &dyn ScreenPermission,
    scratch: &Path,
    scan: impl FnOnce(&Path) -> Result<ScanOutcome, ScanError>,
) -> ScanOutcome {
    if !permission.granted() {
        return ScanOutcome::PermissionDenied;
    }
    sweep_stale(scratch);
    temp_dir(scratch)
        .and_then(|dir| scan(dir.path()))
        .unwrap_or_else(ScanOutcome::from)
}

fn temp_dir(scratch: &Path) -> Result<TempDir, ScanError> {
    fs::create_dir_all(scratch).map_err(|source| ScanError::Scratch {
        path: scratch.to_owned(),
        source,
    })?;
    tempfile::Builder::new()
        .prefix(SCAN_DIR_PREFIX)
        .tempdir_in(scratch)
        .map_err(ScanError::TempDir)
}

/// Open and decode the screenshots, in order. A shot with no file (a display
/// that mirrors another, say) is skipped. No file at all is a failure, never
/// a cancel. A code is reported once, where its text first appears, in one
/// image or across them.
fn decode_shots(shots: &[PathBuf], decoder: &dyn Decoder) -> Result<ScanOutcome, ScanError> {
    let shots: Vec<&PathBuf> = shots.iter().filter(|shot| shot.is_file()).collect();
    if shots.is_empty() {
        return Err(ScanError::NoScreenshot);
    }
    let mut seen = HashSet::new();
    let mut codes = Vec::new();
    for shot in shots {
        let image = image::open(shot).map_err(ScanError::UnreadableImage)?;
        let new = decoder.decode(&image).into_iter();
        codes.extend(new.filter(|code| seen.insert(code.text.clone())));
    }
    Ok(found(codes))
}

fn found(codes: Vec<DecodedCode>) -> ScanOutcome {
    if codes.is_empty() {
        ScanOutcome::NotFound
    } else {
        ScanOutcome::Found { codes }
    }
}
