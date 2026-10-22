mod common;

use std::cell::{Cell, RefCell};
use std::fs;
use std::path::{Path, PathBuf};

use common::{assert_kept, names, qr, stale_left, stale_scratch};
use qr_core::{
    run_scan, sweep_stale, Capture, Capturer, RxingDecoder, ScanOutcome, ScreenPermission,
};

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

/// Notes which stale scans of [`stale_scratch`] are still there when the
/// capture starts, then captures as [`Writes`] does.
struct SeesStale {
    scratch: PathBuf,
    saw: RefCell<Option<Vec<&'static str>>>,
    then: Writes,
}
impl Capturer for SeesStale {
    fn capture(&self, dest: &Path) -> Result<Capture, String> {
        self.saw.replace(Some(stale_left(&self.scratch)));
        self.then.capture(dest)
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

#[test]
fn sweep_stale_removes_stale_scan_directories() {
    let scratch = stale_scratch();
    sweep_stale(scratch.path());
    assert_eq!(stale_left(scratch.path()), Vec::<&str>::new());
    assert_kept(scratch.path());
    assert_eq!(names(scratch.path()), ["keep.txt", "my-scan-keep"]);
}

#[test]
fn a_scan_sweeps_stale_scan_directories_before_it_captures() {
    let scratch = stale_scratch();
    let capturer = SeesStale {
        scratch: scratch.path().to_owned(),
        saw: RefCell::new(None),
        then: Writes("https://example.com"),
    };
    let outcome = run_scan(&Permission(true), &capturer, &RxingDecoder, scratch.path());
    // The scan's own directory lived until the decode.
    match outcome {
        ScanOutcome::Found { codes } => {
            let texts: Vec<&str> = codes.iter().map(|c| c.text.as_str()).collect();
            assert_eq!(texts, ["https://example.com"]);
        }
        other => panic!("expected Found, got {other:?}"),
    }
    let saw = capturer.saw.take().expect("capture was not called");
    assert_eq!(saw, Vec::<&str>::new(), "stale at capture");
    assert_eq!(stale_left(scratch.path()), Vec::<&str>::new());
    assert_kept(scratch.path());
    assert_eq!(names(scratch.path()), ["keep.txt", "my-scan-keep"]);
}

#[test]
fn a_scan_named_file_is_not_swept() {
    let scratch = stale_scratch();
    fs::write(scratch.path().join("scan-notes.txt"), "mine").unwrap();
    sweep_stale(scratch.path());
    assert_eq!(
        fs::read_to_string(scratch.path().join("scan-notes.txt")).unwrap(),
        "mine"
    );
    assert_eq!(stale_left(scratch.path()), Vec::<&str>::new());
}

#[test]
fn the_sweep_stays_directly_under_scratch() {
    let parent = tempfile::tempdir().unwrap();
    let scratch = parent.path().join("scratch");
    fs::create_dir_all(scratch.join("kept/scan-nested")).unwrap();
    fs::write(scratch.join("kept/scan-nested/file.png"), b"nested").unwrap();
    fs::create_dir(parent.path().join("scan-beside")).unwrap();
    fs::write(parent.path().join("scan-beside/file.png"), b"beside").unwrap();
    sweep_stale(&scratch);
    assert!(scratch.join("kept/scan-nested/file.png").is_file());
    assert!(parent.path().join("scan-beside/file.png").is_file());
}

#[cfg(unix)]
#[test]
fn a_scan_named_link_does_not_lead_the_sweep_out_of_scratch() {
    let scratch = stale_scratch();
    let outside = tempfile::tempdir().unwrap();
    fs::write(outside.path().join("target.txt"), "target").unwrap();
    std::os::unix::fs::symlink(outside.path(), scratch.path().join("scan-link")).unwrap();
    sweep_stale(scratch.path());
    assert_eq!(
        fs::read_to_string(outside.path().join("target.txt")).unwrap(),
        "target"
    );
}

#[cfg(unix)]
#[test]
fn a_link_inside_a_stale_scan_does_not_lead_the_sweep_out_of_scratch() {
    let scratch = stale_scratch();
    let outside = tempfile::tempdir().unwrap();
    fs::write(outside.path().join("target.txt"), "target").unwrap();
    std::os::unix::fs::symlink(outside.path(), scratch.path().join("scan-old/link")).unwrap();
    sweep_stale(scratch.path());
    assert_eq!(stale_left(scratch.path()), Vec::<&str>::new());
    assert_eq!(
        fs::read_to_string(outside.path().join("target.txt")).unwrap(),
        "target"
    );
}

#[test]
fn sweeping_a_missing_scratch_is_not_an_error() {
    let parent = tempfile::tempdir().unwrap();
    let missing = parent.path().join("not-yet");
    sweep_stale(&missing);
    assert!(!missing.exists());
}

#[test]
fn sweeping_a_scratch_that_is_a_file_is_not_an_error() {
    let parent = tempfile::tempdir().unwrap();
    let file = parent.path().join("scan-file");
    fs::write(&file, "a file").unwrap();
    sweep_stale(&file);
    assert_eq!(fs::read_to_string(&file).unwrap(), "a file");
}
