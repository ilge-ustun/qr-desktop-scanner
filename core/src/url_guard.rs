//! The last check before the app hands a decoded string to the OS to open.
//! The UI only offers Open for these schemes too; this is the backstop, so a
//! bug or a compromised page in the webview still cannot open `file:` or a
//! custom app scheme.

use thiserror::Error;
use url::Url;

const OPENABLE_SCHEMES: [&str; 3] = ["http", "https", "mailto"];

#[derive(Debug, Error, PartialEq, Eq)]
pub enum GuardError {
    #[error("not a valid URL")]
    Invalid,
    #[error("the {0}: scheme is not opened by this app")]
    Scheme(String),
    #[error("the link has no host")]
    NoHost,
}

/// The parsed URL when it is safe to pass to the OS opener.
pub fn check_openable(text: &str) -> Result<Url, GuardError> {
    let url = Url::parse(text.trim()).map_err(|_| GuardError::Invalid)?;
    let scheme = url.scheme();
    if !OPENABLE_SCHEMES.contains(&scheme) {
        return Err(GuardError::Scheme(scheme.to_owned()));
    }
    if scheme != "mailto" && url.host_str().is_none_or(str::is_empty) {
        return Err(GuardError::NoHost);
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn web_and_mail_links_are_openable() {
        for ok in [
            "https://example.com/a?b=c",
            "http://example.com",
            "  https://example.com  ",
            "mailto:someone@example.com",
        ] {
            assert!(check_openable(ok).is_ok(), "{ok}");
        }
    }

    #[test]
    fn other_schemes_are_refused() {
        for (text, scheme) in [
            ("javascript:alert(1)", "javascript"),
            ("file:///etc/passwd", "file"),
            ("data:text/html,<b>x</b>", "data"),
            ("slack://open", "slack"),
            ("tel:+15551234", "tel"),
        ] {
            assert_eq!(
                check_openable(text),
                Err(GuardError::Scheme(scheme.into())),
                "{text}"
            );
        }
    }

    #[test]
    fn plain_text_is_refused() {
        assert_eq!(check_openable("hello world"), Err(GuardError::Invalid));
        assert_eq!(check_openable("example.com"), Err(GuardError::Invalid));
    }
}
