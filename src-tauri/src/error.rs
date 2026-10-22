//! The one error type of the IPC commands. The page gets it as a string:
//! each variant shows its source's own text, so the page reads what it read
//! when the commands converted each error with `to_string()`.

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Guard(#[from] qr_core::GuardError),
    #[error(transparent)]
    Opener(#[from] tauri_plugin_opener::Error),
    #[error(transparent)]
    Wifi(#[from] qr_core::wifi::WifiError),
    /// Awaiting a blocking task, when the task did not finish.
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    /// settings.json could not be written, so the new shortcut was not
    /// taken: the next launch would not have it.
    #[error("Not saved: {0}")]
    NotSaved(#[source] Box<Error>),
    /// A sentence of the shell's own, or the message of a platform function.
    #[error("{0}")]
    Message(String),
}

impl From<String> for Error {
    fn from(message: String) -> Self {
        Self::Message(message)
    }
}

impl From<&str> for Error {
    fn from(message: &str) -> Self {
        Self::Message(message.to_owned())
    }
}

/// What the page gets when a command fails: the text, as before.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
