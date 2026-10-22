//! The steps both scans share: the scratch directory, the errors and their
//! texts, and the decode of the screenshots.

mod common;

use std::cell::Cell;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use common::{canvas, names, qr};
use image::DynamicImage;
use qr_core::{
    run_find_all, run_scan, Capture, Capturer, DecodedCode, Decoder, DisplaysCapturer,
    RxingDecoder, ScanError, ScanOutcome, ScreenPermission,
};

struct Permission(bool);
impl ScreenPermission for Permission {
    fn granted(&self) -> bool {
        self.0
    }
}

/// Writes these bytes to the destination, as screencapture writes the
/// selection, and notes that it ran.
struct AreaWrites {
    bytes: Vec<u8>,
    called: Cell<bool>,
}
impl Capturer for AreaWrites {
    fn capture(&self, dest: &Path) -> Result<Capture, String> {
        self.called.set(true);
        fs::write(dest, &self.bytes).unwrap();
        Ok(Capture::Taken)
    }
}

/// Writes one display, display-1.png, with these bytes, or nothing
/// (`None`), returns its path either way, and notes that it ran.
struct ScreenWrites {
    bytes: Option<Vec<u8>>,
    called: Cell<bool>,
}
impl DisplaysCapturer for ScreenWrites {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        self.called.set(true);
        let shot = dir.join("display-1.png");
        if let Some(bytes) = &self.bytes {
            fs::write(&shot, bytes).unwrap();
        }
        Ok(vec![shot])
    }
}

fn png(image: &image::GrayImage) -> Vec<u8> {
    let mut bytes = io::Cursor::new(Vec::new());
    image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();
    bytes.into_inner()
}

fn area(bytes: Vec<u8>) -> AreaWrites {
    AreaWrites {
        bytes,
        called: Cell::new(false),
    }
}

fn screen(bytes: Option<Vec<u8>>) -> ScreenWrites {
    ScreenWrites {
        bytes,
        called: Cell::new(false),
    }
}

/// Returns the same codes for each image.
struct Gives(Vec<DecodedCode>);
impl Decoder for Gives {
    fn decode(&self, _: &DynamicImage) -> Vec<DecodedCode> {
        self.0.clone()
    }
}

fn code(text: &str, format: &str) -> DecodedCode {
    DecodedCode {
        text: text.into(),
        format: format.into(),
    }
}

fn texts(outcome: &ScanOutcome) -> Vec<&str> {
    match outcome {
        ScanOutcome::Found { codes } => codes.iter().map(|c| c.text.as_str()).collect(),
        other => panic!("expected Found, got {other:?}"),
    }
}

/// The text image gives for these bytes in a file of this name.
fn unreadable(name: &str, bytes: &[u8]) -> String {
    let own = tempfile::tempdir().unwrap();
    let file = own.path().join(name);
    fs::write(&file, bytes).unwrap();
    let e = image::open(&file).unwrap_err();
    format!("could not read the screenshot: {e}")
}

fn error(message: String) -> ScanOutcome {
    ScanOutcome::Error { message }
}

#[test]
fn run_scan_creates_a_missing_scratch() {
    let root = tempfile::tempdir().unwrap();
    let scratch = root.path().join("Caches/qr");
    let outcome = run_scan(
        &Permission(true),
        &area(png(&qr("https://example.com", 8))),
        &RxingDecoder,
        &scratch,
    );
    assert_eq!(texts(&outcome), ["https://example.com"]);
    assert!(scratch.is_dir(), "no scratch at {}", scratch.display());
    assert_eq!(names(&scratch), Vec::<String>::new());
}

#[test]
fn run_find_all_creates_a_missing_scratch() {
    let root = tempfile::tempdir().unwrap();
    let scratch = root.path().join("Caches/qr");
    let outcome = run_find_all(
        &Permission(true),
        &screen(Some(png(&qr("https://example.com", 8)))),
        &RxingDecoder,
        &scratch,
    );
    assert_eq!(texts(&outcome), ["https://example.com"]);
    assert!(scratch.is_dir(), "no scratch at {}", scratch.display());
    assert_eq!(names(&scratch), Vec::<String>::new());
}

#[test]
fn a_refused_scan_creates_no_scratch() {
    let root = tempfile::tempdir().unwrap();
    let scratch = root.path().join("Caches/qr");
    let capturer = area(png(&qr("https://example.com", 8)));
    let outcome = run_scan(&Permission(false), &capturer, &RxingDecoder, &scratch);
    assert_eq!(outcome, ScanOutcome::PermissionDenied);
    let displays = screen(Some(png(&qr("https://example.com", 8))));
    let outcome = run_find_all(&Permission(false), &displays, &RxingDecoder, &scratch);
    assert_eq!(outcome, ScanOutcome::PermissionDenied);
    assert!(!capturer.called.get());
    assert!(!displays.called.get());
    assert!(!root.path().join("Caches").exists());
}

/// `make` gives the same error each time: an error that is not `Clone` is
/// made once for its text and once for `From`.
fn assert_message(make: impl Fn() -> ScanError, text: &str) {
    assert_eq!(make().to_string(), text);
    assert_eq!(ScanOutcome::from(make()), error(text.into()));
}

#[test]
fn scan_errors_keep_todays_messages() {
    assert_message(
        || ScanError::Scratch {
            path: PathBuf::from("/tmp/qr cache"),
            source: io::Error::other("disk full"),
        },
        "could not create /tmp/qr cache: disk full",
    );
    assert_message(
        || ScanError::TempDir(io::Error::other("disk full")),
        "could not create a temporary directory: disk full",
    );
    assert_message(
        || ScanError::Capture("screencapture exited with 2".into()),
        "screencapture exited with 2",
    );
    let not_an_image = || image::load_from_memory(b"not an image").unwrap_err();
    assert_message(
        || ScanError::UnreadableImage(not_an_image()),
        &format!("could not read the screenshot: {}", not_an_image()),
    );
    assert_message(|| ScanError::NoScreenshot, "no screenshot was written");
}

#[test]
fn the_flows_report_todays_messages() {
    // A scratch that cannot be created: a regular file is in its path.
    let root = tempfile::tempdir().unwrap();
    fs::write(root.path().join("file"), b"").unwrap();
    let scratch = root.path().join("file/cache");
    let e = fs::create_dir_all(&scratch).unwrap_err();
    let expected = error(format!("could not create {}: {}", scratch.display(), e));
    let capturer = area(png(&qr("https://example.com", 8)));
    assert_eq!(
        run_scan(&Permission(true), &capturer, &RxingDecoder, &scratch),
        expected
    );
    let displays = screen(Some(png(&qr("https://example.com", 8))));
    assert_eq!(
        run_find_all(&Permission(true), &displays, &RxingDecoder, &scratch),
        expected
    );
    assert!(!capturer.called.get(), "the area capturer ran");
    assert!(!displays.called.get(), "the displays capturer ran");

    // A selection that is not an image.
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_scan(
        &Permission(true),
        &area(b"not an image".to_vec()),
        &RxingDecoder,
        scratch.path(),
    );
    assert_eq!(outcome, error(unreadable("selection.png", b"not an image")));
    assert_eq!(names(scratch.path()), Vec::<String>::new());

    // A display that is not an image.
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_find_all(
        &Permission(true),
        &screen(Some(b"not an image".to_vec())),
        &RxingDecoder,
        scratch.path(),
    );
    assert_eq!(outcome, error(unreadable("display-1.png", b"not an image")));
    assert_eq!(names(scratch.path()), Vec::<String>::new());

    // A display reported and not written.
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_find_all(
        &Permission(true),
        &screen(None),
        &RxingDecoder,
        scratch.path(),
    );
    assert_eq!(outcome, error("no screenshot was written".into()));
    assert_eq!(names(scratch.path()), Vec::<String>::new());
}

#[test]
fn run_scan_reports_a_repeated_code_once() {
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_scan(
        &Permission(true),
        &area(png(&canvas(10, 10, 255))),
        &Gives(vec![
            code("a", "qrcode"),
            code("b", "qrcode"),
            code("a", "other"),
        ]),
        scratch.path(),
    );
    assert_eq!(
        outcome,
        ScanOutcome::Found {
            codes: vec![code("a", "qrcode"), code("b", "qrcode")]
        }
    );
    assert_eq!(names(scratch.path()), Vec::<String>::new());
}
