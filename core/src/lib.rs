//! The app's logic, kept free of Tauri and macOS APIs so `cargo test` covers
//! it on any OS. The Tauri shell in `src-tauri` supplies the platform pieces
//! (permission check, screen capture) through the traits in [`scan`].

pub mod decode;
pub mod scan;
pub mod url_guard;

pub use decode::{DecodedCode, Decoder, RxingDecoder};
pub use scan::{run_scan, Capture, Capturer, ScanOutcome, ScreenPermission};
pub use url_guard::{check_openable, GuardError};
