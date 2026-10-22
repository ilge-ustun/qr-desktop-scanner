//! QR images drawn at test time, so the fixtures are code rather than binary
//! files, and each test says exactly what it is made of. The same goes for
//! the scratch directory a scan sweeps.

#![allow(dead_code)]

use std::fs;
use std::path::Path;

use image::{imageops, GrayImage, Luma};
use qrcode::QrCode;
use tempfile::TempDir;

/// A black-on-white code with its quiet zone, `module` pixels per module.
pub fn qr(text: &str, module: u32) -> GrayImage {
    QrCode::new(text.as_bytes())
        .unwrap()
        .render::<Luma<u8>>()
        .quiet_zone(true)
        .module_dimensions(module, module)
        .build()
}

/// A flat canvas of one grey, standing in for the rest of the screen.
pub fn canvas(width: u32, height: u32, grey: u8) -> GrayImage {
    GrayImage::from_pixel(width, height, Luma([grey]))
}

/// A code drawn the way some PDF generators draw it: every module its own
/// square, so a thin light seam runs between neighbouring dark modules.
pub fn qr_with_seams(text: &str, module: u32) -> GrayImage {
    let mut image = qr(text, module);
    for y in 0..image.height() {
        for x in 0..image.width() {
            if x % module == 0 || y % module == 0 {
                image.put_pixel(x, y, Luma([235]));
            }
        }
    }
    image
}

pub fn paste(onto: &mut GrayImage, what: &GrayImage, x: i64, y: i64) {
    imageops::overlay(onto, what, x, y);
}

/// A scratch directory as an app that ended mid-scan leaves it: two stale
/// scan directories with a screenshot in each, beside a file and a directory
/// that are not scans.
pub fn stale_scratch() -> TempDir {
    let scratch = tempfile::tempdir().unwrap();
    let at = scratch.path();
    fs::create_dir(at.join("scan-old")).unwrap();
    fs::write(at.join("scan-old/selection.png"), b"stale").unwrap();
    fs::create_dir(at.join("scan-older")).unwrap();
    fs::write(at.join("scan-older/display-1.png"), b"stale").unwrap();
    fs::write(at.join("keep.txt"), "keep").unwrap();
    // "scan-" is in the name, but the name does not start with it.
    fs::create_dir(at.join("my-scan-keep")).unwrap();
    fs::write(at.join("my-scan-keep/note.txt"), "note").unwrap();
    scratch
}

/// The stale scans of [`stale_scratch`] that exist under `scratch`.
pub fn stale_left(scratch: &Path) -> Vec<&'static str> {
    ["scan-old", "scan-older"]
        .into_iter()
        .filter(|name| scratch.join(name).exists())
        .collect()
}

/// The entries of [`stale_scratch`] that are not scans are there, with their
/// content.
pub fn assert_kept(scratch: &Path) {
    assert_eq!(
        fs::read_to_string(scratch.join("keep.txt")).unwrap(),
        "keep"
    );
    assert_eq!(
        fs::read_to_string(scratch.join("my-scan-keep/note.txt")).unwrap(),
        "note"
    );
}

/// The names directly under `scratch`, sorted.
pub fn names(scratch: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(scratch)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names
}
