//! What screencapture, CoreGraphics and `open` report, read as the app reads
//! it. The shell runs the commands; the rules for their output are here, so
//! a test reaches them on any OS. A status is passed as plain values (the
//! exit code, `ExitStatus`'s text), which code here can make on every OS.

use std::path::{Path, PathBuf};

use crate::scan::Capture;

/// What `screencapture -i` ended with. A written file is the selection,
/// whatever the status. With no file, Esc exits 0 or 1 depending on the
/// macOS version; any other `code`, or none (a signal), is a failure, named
/// by `status`.
pub fn selection_verdict(
    file_written: bool,
    code: Option<i32>,
    status: &str,
) -> Result<Capture, String> {
    if file_written {
        Ok(Capture::Taken)
    } else if matches!(code, Some(0 | 1)) {
        Ok(Capture::Cancelled)
    } else {
        Err(format!("screencapture failed: {status}"))
    }
}

/// The number of active displays, from CoreGraphics' error and count. Zero
/// displays is an error too: there is nothing to capture.
pub fn display_count(err: i32, count: u32) -> Result<u32, String> {
    match (err, count) {
        (0, 0) => Err("no display is active".into()),
        (0, count) => Ok(count),
        (err, _) => Err(format!(
            "could not list the displays: CoreGraphics error {err}"
        )),
    }
}

/// Where screencapture writes each of `count` displays in `dir`, the main
/// display first: given one file per display, it writes them in order.
pub fn display_files(dir: &Path, count: u32) -> Vec<PathBuf> {
    (1..=count)
        .map(|n| dir.join(format!("display-{n}.png")))
        .collect()
}

/// What `open` ended with when it was given the Screen Recording pane. On a
/// failure, what it wrote to stderr says why; `status` names the failure
/// when it wrote nothing. On success, whatever it wrote is not an error.
pub fn open_settings_result(success: bool, status: &str, stderr: &str) -> Result<(), String> {
    if success {
        return Ok(());
    }
    let said = stderr.trim();
    let why = if said.is_empty() { status } else { said };
    Err(format!("could not open System Settings: {why}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selection_verdict_looks_at_the_file_first() {
        assert_eq!(
            selection_verdict(true, Some(0), "exit status: 0"),
            Ok(Capture::Taken)
        );
        assert_eq!(
            selection_verdict(true, Some(1), "exit status: 1"),
            Ok(Capture::Taken)
        );
        assert_eq!(
            selection_verdict(true, Some(2), "exit status: 2"),
            Ok(Capture::Taken)
        );
        assert_eq!(
            selection_verdict(true, None, "signal: 9 (SIGKILL)"),
            Ok(Capture::Taken)
        );
        assert_eq!(
            selection_verdict(false, Some(0), "exit status: 0"),
            Ok(Capture::Cancelled)
        );
        assert_eq!(
            selection_verdict(false, Some(1), "exit status: 1"),
            Ok(Capture::Cancelled)
        );
        assert_eq!(
            selection_verdict(false, Some(2), "exit status: 2"),
            Err("screencapture failed: exit status: 2".to_owned())
        );
        assert_eq!(
            selection_verdict(false, None, "signal: 9 (SIGKILL)"),
            Err("screencapture failed: signal: 9 (SIGKILL)".to_owned())
        );
    }

    #[test]
    fn display_count_needs_a_display_and_no_error() {
        assert_eq!(display_count(0, 1), Ok(1));
        assert_eq!(display_count(0, 3), Ok(3));
        assert_eq!(display_count(0, 0), Err("no display is active".to_owned()));
        assert_eq!(
            display_count(1000, 0),
            Err("could not list the displays: CoreGraphics error 1000".to_owned())
        );
        assert_eq!(
            display_count(1001, 2),
            Err("could not list the displays: CoreGraphics error 1001".to_owned())
        );
    }

    #[test]
    fn display_files_are_numbered_from_one_in_the_directory() {
        let dir = Path::new("/tmp/scan-test");
        assert_eq!(display_files(dir, 1), vec![dir.join("display-1.png")]);
        assert_eq!(
            display_files(dir, 3),
            vec![
                dir.join("display-1.png"),
                dir.join("display-2.png"),
                dir.join("display-3.png"),
            ]
        );
        assert_eq!(display_files(dir, 0), Vec::<PathBuf>::new());
    }

    #[test]
    fn open_settings_result_names_why_open_failed() {
        assert_eq!(open_settings_result(true, "exit status: 0", ""), Ok(()));
        assert_eq!(
            open_settings_result(true, "exit status: 0", "a warning\n"),
            Ok(())
        );
        assert_eq!(
            open_settings_result(
                false,
                "exit status: 1",
                "LSOpenURLsWithRole() failed with error -10814.\n"
            ),
            Err(
                "could not open System Settings: LSOpenURLsWithRole() failed with error -10814."
                    .to_owned()
            )
        );
        assert_eq!(
            open_settings_result(false, "exit status: 1", "line one\nline two\n"),
            Err("could not open System Settings: line one\nline two".to_owned())
        );
        assert_eq!(
            open_settings_result(false, "exit status: 1", ""),
            Err("could not open System Settings: exit status: 1".to_owned())
        );
        assert_eq!(
            open_settings_result(false, "exit status: 1", " \n"),
            Err("could not open System Settings: exit status: 1".to_owned())
        );
    }
}
