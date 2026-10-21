//! Finding QR codes in an image.

use std::collections::HashSet;

use image::{imageops, DynamicImage, GrayImage};
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

/// Below this many pixels on the short side a selection is upscaled before a
/// second attempt: a small code on a non-Retina screen has modules only a
/// pixel or two wide, which the binarizer loses.
const UPSCALE_BELOW: u32 = 600;

impl Decoder for RxingDecoder {
    fn decode(&self, image: &DynamicImage) -> Vec<DecodedCode> {
        let gray = image.to_luma8();
        let found = detect(&gray);
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
            return detect(&up);
        }
        Vec::new()
    }
}

fn detect(gray: &GrayImage) -> Vec<DecodedCode> {
    let mut hints = DecodeHints {
        PossibleFormats: Some(HashSet::from([BarcodeFormat::QR_CODE])),
        TryHarder: Some(true),
        AlsoInverted: Some(true),
        ..Default::default()
    };
    let image = DynamicImage::ImageLuma8(gray.clone());
    let results =
        helpers::detect_multiple_in_image_with_hints(image, &mut hints).unwrap_or_default();

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
