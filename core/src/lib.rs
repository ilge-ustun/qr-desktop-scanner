//! The app's logic, kept free of Tauri and macOS APIs so `cargo test` covers
//! it on any OS. The Tauri shell in `src-tauri` supplies the platform pieces
//! (permission check, screen capture) through the traits in [`scan`].

pub mod decode;
pub mod scan;
pub mod url_guard;
pub mod wifi;

pub use decode::{DecodedCode, Decoder, RxingDecoder};
pub use scan::{
    run_find_all, run_scan, sweep_stale, Capture, Capturer, DisplaysCapturer, ScanOutcome, Scope,
    ScreenPermission,
};
pub use url_guard::{check_openable, GuardError};
