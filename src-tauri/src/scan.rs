//! Running a scan off the main thread and reporting it to the page.

use std::time::Duration;

use qr_core::{RxingDecoder, ScanOutcome, Scope, ScreenPermission, SingleFlight};
use tauri::{AppHandle, Emitter, Manager};

use crate::{platform, popover};

/// Long enough for the window server to take the popover off the screen, so
/// it is not in the selection or the screenshots.
const HIDE_SETTLE: Duration = Duration::from_millis(150);

/// One scan at a time, of either kind: a second hotkey press during a
/// selection, or Find All during one, is dropped. The sweep before each scan
/// counts on this.
#[derive(Default)]
pub struct ScanState {
    flight: SingleFlight,
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
    let outcome = {
        let state = app.state::<ScanState>();
        let Some(_flight) = state.flight.try_start() else {
            return;
        };
        // The flight ends when the guard drops at the end of this block, on
        // every way out of it, a panic included.
        capture_and_decode(&app, scope).await
    };

    if outcome.asks_for_permission() {
        platform::request_permission();
    }
    let _ = app.emit("scan://result", &outcome);
    if outcome.reopens_popover() {
        popover::show(&app);
    }
}

async fn capture_and_decode(app: &AppHandle, scope: Scope) -> ScanOutcome {
    // Checked here too, so that without the permission the popover stays
    // open and the page gets no started event.
    if !platform::Permission.granted() {
        return ScanOutcome::PermissionDenied;
    }
    let scratch = match app.path().app_cache_dir() {
        Ok(dir) => dir,
        Err(e) => {
            return ScanOutcome::Error {
                message: format!("no cache directory: {e}"),
            }
        }
    };
    // "area" or "screen": the page words its result for the kind of scan.
    let _ = app.emit("scan://started", scope);
    popover::hide(app);

    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(HIDE_SETTLE);
        qr_core::run(
            scope,
            &platform::Permission,
            &platform::Screencapture,
            &platform::ScreencaptureDisplays,
            &RxingDecoder,
            &scratch,
        )
    })
    .await
    .unwrap_or_else(|e| ScanOutcome::Error {
        message: format!("the scan stopped unexpectedly: {e}"),
    })
}
