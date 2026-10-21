mod common;

use std::cell::{Cell, RefCell};
use std::fs;
use std::path::{Path, PathBuf};

use common::{canvas, qr};
use image::DynamicImage;
use qr_core::{
    run_find_all, DecodedCode, Decoder, DisplaysCapturer, RxingDecoder, ScanOutcome, Scope,
    ScreenPermission,
};

struct Permission(bool);
impl ScreenPermission for Permission {
    fn granted(&self) -> bool {
        self.0
    }
}

/// One display per entry: a code with that text, or nothing (`None`).
/// Writes them into the directory it is given, as screencapture does with
/// one file name per display, and remembers that directory.
struct Displays {
    shows: Vec<Option<&'static str>>,
    given: RefCell<Option<PathBuf>>,
}

fn displays(shows: &[Option<&'static str>]) -> Displays {
    Displays {
        shows: shows.to_vec(),
        given: RefCell::new(None),
    }
}

impl DisplaysCapturer for Displays {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        assert!(dir.is_dir(), "not a directory: {}", dir.display());
        self.given.replace(Some(dir.to_owned()));
        let mut shots = Vec::new();
        for (i, shows) in self.shows.iter().enumerate() {
            let shot = dir.join(format!("display-{}.png", i + 1));
            match shows {
                Some(text) => qr(text, 8).save(&shot).unwrap(),
                None => canvas(400, 300, 200).save(&shot).unwrap(),
            }
            shots.push(shot);
        }
        Ok(shots)
    }
}

/// Reports these files as written, and writes none of them.
struct WritesNothing(&'static [&'static str]);
impl DisplaysCapturer for WritesNothing {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        Ok(self.0.iter().map(|name| dir.join(name)).collect())
    }
}

/// Writes a file that is not an image.
struct WritesGarbage;
impl DisplaysCapturer for WritesGarbage {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        let shot = dir.join("display-1.png");
        fs::write(&shot, b"not an image").unwrap();
        Ok(vec![shot])
    }
}

struct Fails;
impl DisplaysCapturer for Fails {
    fn capture_displays(&self, _: &Path) -> Result<Vec<PathBuf>, String> {
        Err("screencapture exited with 2".into())
    }
}

struct MustNotRun(Cell<bool>);
impl DisplaysCapturer for MustNotRun {
    fn capture_displays(&self, _: &Path) -> Result<Vec<PathBuf>, String> {
        self.0.set(true);
        Ok(Vec::new())
    }
}

/// Decodes by image width, so a test can say exactly what each display
/// holds, formats included.
struct ByWidth(fn(u32) -> Vec<DecodedCode>);
impl Decoder for ByWidth {
    fn decode(&self, image: &DynamicImage) -> Vec<DecodedCode> {
        (self.0)(image.width())
    }
}

/// Blank displays of these widths.
struct Blank(&'static [u32]);
impl DisplaysCapturer for Blank {
    fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
        let mut shots = Vec::new();
        for (i, &width) in self.0.iter().enumerate() {
            let shot = dir.join(format!("display-{}.png", i + 1));
            canvas(width, 10, 255).save(&shot).unwrap();
            shots.push(shot);
        }
        Ok(shots)
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

fn find_all_with(
    permission: bool,
    capturer: &dyn DisplaysCapturer,
    decoder: &dyn Decoder,
) -> (ScanOutcome, Vec<String>, PathBuf) {
    let scratch = tempfile::tempdir().unwrap();
    let outcome = run_find_all(&Permission(permission), capturer, decoder, scratch.path());
    let left: Vec<String> = fs::read_dir(scratch.path())
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    (outcome, left, scratch.path().to_owned())
}

fn find_all(permission: bool, capturer: &dyn DisplaysCapturer) -> (ScanOutcome, Vec<String>) {
    let (outcome, left, _) = find_all_with(permission, capturer, &RxingDecoder);
    (outcome, left)
}

#[test]
fn no_permission_means_no_capture() {
    let capturer = MustNotRun(Cell::new(false));
    let (outcome, left) = find_all(false, &capturer);
    assert_eq!(outcome, ScanOutcome::PermissionDenied);
    assert!(!capturer.0.get());
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn a_different_code_on_each_display_finds_both_the_first_display_first() {
    let (outcome, left) = find_all(
        true,
        &displays(&[Some("https://zebra.example"), Some("https://apple.example")]),
    );
    assert_eq!(
        texts(&outcome),
        ["https://zebra.example", "https://apple.example"]
    );
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn the_same_code_on_two_displays_is_found_once() {
    let (outcome, left) = find_all(
        true,
        &displays(&[Some("https://example.com"), Some("https://example.com")]),
    );
    assert_eq!(
        outcome,
        ScanOutcome::Found {
            codes: vec![code("https://example.com", "qrcode")]
        }
    );
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn codes_are_merged_by_text_keeping_the_first_occurrence_in_order() {
    let (outcome, left, _) = find_all_with(
        true,
        &Blank(&[10, 20, 30]),
        &ByWidth(|width| match width {
            10 => vec![code("a", "first"), code("b", "first")],
            20 => vec![
                code("b", "second"),
                code("c", "second"),
                code("a", "second"),
            ],
            _ => vec![code("d", "third"), code("c", "third")],
        }),
    );
    assert_eq!(
        outcome,
        ScanOutcome::Found {
            codes: vec![
                code("a", "first"),
                code("b", "first"),
                code("c", "second"),
                code("d", "third"),
            ]
        }
    );
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn a_code_on_one_display_only_is_found() {
    let (outcome, left) = find_all(true, &displays(&[None, Some("only here")]));
    assert_eq!(texts(&outcome), ["only here"]);
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn no_code_on_any_display_is_not_found() {
    let (outcome, left) = find_all(true, &displays(&[None, None]));
    assert_eq!(outcome, ScanOutcome::NotFound);
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn a_failed_capture_is_an_error_with_its_message_and_cleans_up() {
    let (outcome, left) = find_all(true, &Fails);
    assert_eq!(
        outcome,
        ScanOutcome::Error {
            message: "screencapture exited with 2".into()
        }
    );
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn a_capture_that_wrote_no_image_is_an_error_never_a_cancel() {
    for written in [&["display-1.png", "display-2.png"][..], &[]] {
        let (outcome, left) = find_all(true, &WritesNothing(written));
        assert!(
            matches!(outcome, ScanOutcome::Error { .. }),
            "{written:?}: expected Error, got {outcome:?}"
        );
        assert!(left.is_empty(), "left behind: {left:?}");
    }
}

#[test]
fn a_display_with_no_image_is_skipped_when_another_has_one() {
    struct OneOfTwo;
    impl DisplaysCapturer for OneOfTwo {
        fn capture_displays(&self, dir: &Path) -> Result<Vec<PathBuf>, String> {
            let shot = dir.join("display-1.png");
            qr("main display", 8).save(&shot).unwrap();
            Ok(vec![shot, dir.join("display-2.png")])
        }
    }
    let (outcome, left) = find_all(true, &OneOfTwo);
    assert_eq!(texts(&outcome), ["main display"]);
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn an_image_that_cannot_be_read_is_an_error_and_cleans_up() {
    let (outcome, left) = find_all(true, &WritesGarbage);
    match &outcome {
        ScanOutcome::Error { message } => assert!(
            message.starts_with("could not read the screenshot"),
            "{message}"
        ),
        other => panic!("expected Error, got {other:?}"),
    }
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn the_capture_gets_a_fresh_directory_under_scratch() {
    let capturer = displays(&[Some("x")]);
    let (_, left, scratch) = find_all_with(true, &capturer, &RxingDecoder);
    let given = capturer.given.take().expect("capture was not called");
    assert_eq!(given.parent(), Some(scratch.as_path()));
    assert!(
        given
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("scan-"),
        "{}",
        given.display()
    );
    assert!(!given.exists());
    assert!(left.is_empty(), "left behind: {left:?}");
}

#[test]
fn scopes_serialize_as_the_ui_expects() {
    assert_eq!(serde_json::to_string(&Scope::Area).unwrap(), r#""area""#);
    assert_eq!(
        serde_json::to_string(&Scope::Screen).unwrap(),
        r#""screen""#
    );
}
