mod common;

use std::cell::Cell;
use std::fs;
use std::path::Path;

use common::qr;
use qr_core::{run_scan, Capture, Capturer, RxingDecoder, ScanOutcome, ScreenPermission};

struct Permission(bool);
impl ScreenPermission for Permission {
    fn granted(&self) -> bool {
        self.0
    }
}

/// Writes a code to the destination, as screencapture writes the selection.
struct Writes(&'static str);
impl Capturer for Writes {
    fn capture(&self, dest: &Path) -> Result<Capture, String> {
        qr(self.0, 8).save(dest).unwrap();
        Ok(Capture::Taken)
    }
}

/// screencapture after Esc: exits 0 and writes nothing.
struct WritesNothing;
impl Capturer for WritesNothing {
    fn capture(&self, _: &Path) -> Result<Capture, String> {
        Ok(Capture::Taken)
    }
}

struct Fails;
impl Capturer for Fails {
    fn capture(&self, _: &Path) -> Result<Capture, String> {
        Err("screencapture exited with 2".into())
    }
}

struct MustNotRun(Cell<bool>);
impl Capturer for MustNotRun {
    fn capture(&self, _: &Path) -> Result<Capture, String> {
        self.0.set(true);
        Ok(Capture::Cancelled)
    }
}

fn scan(permission: bool, capturer: &dyn Capturer) -> (ScanOutcome, Vec<String>) {
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_scan(
        &Permission(permission),
        capturer,
        &RxingDecoder,
        scratch.path(),
    );
    let left: Vec<String> = fs::read_dir(scratch.path())
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    (outcome, left)
}

#[test]
fn a_selection_with_a_code_is_found_and_the_screenshot_is_removed() {
    let (outcome, left) = scan(true, &Writes("https://example.com"));
    match outcome {
        ScanOutcome::Found { codes } => assert_eq!(codes[0].text, "https://example.com"),
        other => panic!("expected Found, got {other:?}"),
    }
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn no_permission_means_no_capture() {
    let capturer = MustNotRun(Cell::new(false));
    let (outcome, _) = scan(false, &capturer);
    assert_eq!(outcome, ScanOutcome::PermissionDenied);
    assert!(!capturer.0.get());
}

#[test]
fn esc_writes_nothing_and_is_a_cancel() {
    let (outcome, left) = scan(true, &WritesNothing);
    assert_eq!(outcome, ScanOutcome::Cancelled);
    assert!(left.is_empty());
}

#[test]
fn a_failed_capture_is_an_error_and_cleans_up() {
    let (outcome, left) = scan(true, &Fails);
    assert_eq!(
        outcome,
        ScanOutcome::Error {
            message: "screencapture exited with 2".into()
        }
    );
    assert!(left.is_empty());
}

#[test]
fn outcomes_serialize_as_the_ui_expects() {
    let found = ScanOutcome::Found {
        codes: vec![qr_core::DecodedCode {
            text: "t".into(),
            format: "qrcode".into(),
        }],
    };
    assert_eq!(
        serde_json::to_string(&found).unwrap(),
        r#"{"kind":"found","codes":[{"text":"t","format":"qrcode"}]}"#
    );
    assert_eq!(
        serde_json::to_string(&ScanOutcome::PermissionDenied).unwrap(),
        r#"{"kind":"permissionDenied"}"#
    );
}
