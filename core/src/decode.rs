//! Finding QR codes in an image.

use std::collections::HashSet;

use image::{imageops, DynamicImage, GrayImage, Luma};
use rxing::{helpers, BarcodeFormat, DecodeHints};
use serde::Serialize;

/// One code found in an image. `text` is untrusted input: it came from
/// whatever was on the screen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DecodedCode {
    pub text: String,
    pub format: String,
}

pub trait Decoder {
    /// Every distinct code in the image; empty when there is none.
    fn decode(&self, image: &DynamicImage) -> Vec<DecodedCode>;
}

/// Pure-Rust decoder (a ZXing port). It works on every OS, so the fleet can
/// test it; Apple Vision may later sit in front of it on macOS.
#[derive(Debug, Default, Clone, Copy)]
pub struct RxingDecoder;

/// Below this many pixels on the short side a selection is also tried
/// upscaled: a small code on a non-Retina screen has modules only a pixel or
/// two wide, which the binarizer loses.
const UPSCALE_BELOW: u32 = 600;

impl Decoder for RxingDecoder {
    fn decode(&self, image: &DynamicImage) -> Vec<DecodedCode> {
        let gray = image.to_luma8();
        let found = detect(gray.clone());
        if !found.is_empty() {
            return found;
        }
        // Some PDFs draw every module as its own square, leaving a light seam
        // between dark neighbours that breaks the finder patterns. Darkening
        // each pixel to its 3x3 neighbourhood closes the seams; light modules
        // lose a pixel at each edge, which a readable code can spare.
        let found = detect(darken(&gray));
        if !found.is_empty() {
            return found;
        }
        if gray.width().min(gray.height()) < UPSCALE_BELOW {
            let up = imageops::resize(
                &gray,
                gray.width() * 3,
                gray.height() * 3,
                imageops::FilterType::Nearest,
            );
            return detect(up);
        }
        Vec::new()
    }
}

/// Grey-level erosion with a 3x3 square, done as a row pass and a column pass.
fn darken(gray: &GrayImage) -> GrayImage {
    let (w, h) = gray.dimensions();
    let min3 = |a: u8, b: u8, c: u8| a.min(b).min(c);
    let rows = GrayImage::from_fn(w, h, |x, y| {
        let at = |x: u32| gray.get_pixel(x, y)[0];
        Luma([min3(at(x.saturating_sub(1)), at(x), at((x + 1).min(w - 1)))])
    });
    GrayImage::from_fn(w, h, |x, y| {
        let at = |y: u32| rows.get_pixel(x, y)[0];
        Luma([min3(at(y.saturating_sub(1)), at(y), at((y + 1).min(h - 1)))])
    })
}

fn detect(gray: GrayImage) -> Vec<DecodedCode> {
    let mut hints = DecodeHints {
        PossibleFormats: Some(HashSet::from([BarcodeFormat::QR_CODE])),
        TryHarder: Some(true),
        AlsoInverted: Some(true),
        ..Default::default()
    };
    let (width, height) = gray.dimensions();
    let results =
        helpers::detect_multiple_in_luma_with_hints(gray.into_raw(), width, height, &mut hints)
            .unwrap_or_default();

    let mut seen = HashSet::new();
    results
        .into_iter()
        .filter(|r| seen.insert(r.getText().to_owned()))
        .map(|r| DecodedCode {
            text: r.getText().to_owned(),
            format: r.getBarcodeFormat().to_string(),
        })
        .collect()
}
