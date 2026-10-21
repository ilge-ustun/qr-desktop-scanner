//! Running a scan off the main thread and reporting it to the page.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use qr_core::{run_find_all, run_scan, RxingDecoder, ScanOutcome, Scope, ScreenPermission};
use tauri::{AppHandle, Emitter, Manager};

use crate::{platform, popover};

/// Long enough for the window server to take the popover off the screen, so
/// it is not in the selection or the screenshots.
const HIDE_SETTLE: Duration = Duration::from_millis(150);

/// One scan at a time, of either kind: a second hotkey press during a
/// selection, or Find All during one, is dropped.
#[derive(Default)]
pub struct ScanState {
    running: AtomicBool,
}

/// The drag scan: the user selects a region.
pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(scan(app, Scope::Area));
}

/// Every code on every display, with no selection.
pub fn spawn_find_all(app: AppHandle) {
    tauri::async_runtime::spawn(scan(app, Scope::Screen));
}

async fn scan(app: AppHandle, scope: Scope) {
    if app
        .state::<ScanState>()
        .running
        .swap(true, Ordering::SeqCst)
    {
        return;
    }
    let outcome = capture_and_decode(&app, scope).await;
    app.state::<ScanState>()
        .running
        .store(false, Ordering::SeqCst);

    if outcome == ScanOutcome::PermissionDenied {
        platform::request_permission();
    }
    let _ = app.emit("scan://result", &outcome);
    // After Esc the user is done; don't pop the window back up. A find-all
    // never ends Cancelled.
    if outcome != ScanOutcome::Cancelled {
        popover::show(&app);
    }
}

async fn capture_and_decode(app: &AppHandle, scope: Scope) -> ScanOutcome {
    if !platform::Permission.granted() {
        return ScanOutcome::PermissionDenied;
    }
    let scratch = match app.path().app_cache_dir() {
        Ok(dir) => dir,
        Err(e) => return error(format!("no cache directory: {e}")),
    };
    if let Err(e) = std::fs::create_dir_all(&scratch) {
        return error(format!("could not create {}: {e}", scratch.display()));
    }
    // "area" or "screen": the page words its result for the kind of scan.
    let _ = app.emit("scan://started", scope);
    popover::hide(app);

    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(HIDE_SETTLE);
        match scope {
            Scope::Area => run_scan(
                &platform::Permission,
                &platform::Screencapture,
                &RxingDecoder,
                &scratch,
            ),
            Scope::Screen => run_find_all(
                &platform::Permission,
                &platform::ScreencaptureDisplays,
                &RxingDecoder,
                &scratch,
            ),
        }
    })
    .await
    .unwrap_or_else(|e| error(format!("the scan stopped unexpectedly: {e}")))
}

fn error(message: String) -> ScanOutcome {
    ScanOutcome::Error { message }
}
