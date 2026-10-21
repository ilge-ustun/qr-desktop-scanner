//! The two things only the OS can do: check the Screen Recording permission
//! and let the user select a region of the screen. macOS is the only target;
//! the stub exists so the shell compiles, and is linted, on Linux.

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
mod unsupported;
#[cfg(not(target_os = "macos"))]
pub use unsupported::*;
