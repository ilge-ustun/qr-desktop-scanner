mod common;

use common::{canvas, paste, qr};
use image::{imageops, DynamicImage};
use qr_core::{Decoder, RxingDecoder};

fn texts(image: image::GrayImage) -> Vec<String> {
    let mut found: Vec<String> = RxingDecoder
        .decode(&DynamicImage::ImageLuma8(image))
        .into_iter()
        .map(|c| c.text)
        .collect();
    found.sort();
    found
}

#[test]
fn a_plain_code_is_decoded_with_its_format() {
    let codes = RxingDecoder.decode(&DynamicImage::ImageLuma8(qr("https://example.com/menu", 8)));
    assert_eq!(codes.len(), 1);
    assert_eq!(codes[0].text, "https://example.com/menu");
    assert_eq!(codes[0].format, "qrcode");
}

#[test]
fn a_code_inside_a_larger_screenshot_is_found() {
    let mut screen = canvas(1400, 900, 200);
    paste(
        &mut screen,
        &qr("WIFI:S:Home;T:WPA;P:secret;;", 6),
        700,
        300,
    );
    assert_eq!(texts(screen), ["WIFI:S:Home;T:WPA;P:secret;;"]);
}

#[test]
fn a_rotated_code_is_decoded() {
    let rotated = imageops::rotate90(&qr("rotated", 8));
    assert_eq!(texts(rotated), ["rotated"]);
}

#[test]
fn a_small_code_is_decoded() {
    // Two pixels per module: a code a few centimetres wide on a 1x display.
    assert_eq!(
        texts(qr("https://example.com/s", 2)),
        ["https://example.com/s"]
    );
}

#[test]
fn a_light_on_dark_code_is_decoded() {
    let mut inverted = qr("inverted", 8);
    imageops::invert(&mut inverted);
    assert_eq!(texts(inverted), ["inverted"]);
}

#[test]
fn two_codes_in_one_selection_are_both_found() {
    let mut screen = canvas(1200, 600, 255);
    paste(&mut screen, &qr("first", 8), 40, 80);
    paste(&mut screen, &qr("second", 8), 700, 80);
    assert_eq!(texts(screen), ["first", "second"]);
}

#[test]
fn the_same_code_twice_is_reported_once() {
    let mut screen = canvas(1200, 600, 255);
    paste(&mut screen, &qr("same", 8), 40, 80);
    paste(&mut screen, &qr("same", 8), 700, 80);
    assert_eq!(texts(screen), ["same"]);
}

#[test]
fn an_image_without_a_code_finds_nothing() {
    assert!(texts(canvas(800, 600, 230)).is_empty());
}
