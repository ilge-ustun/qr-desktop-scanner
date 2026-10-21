//! QR images drawn at test time, so the fixtures are code rather than binary
//! files, and each test says exactly what it is made of.

#![allow(dead_code)]

use image::{imageops, GrayImage, Luma};
use qrcode::QrCode;

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
