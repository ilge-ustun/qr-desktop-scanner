//! One scan at a time. The shell takes the guard before a scan starts, and
//! the flight ends when the guard drops, on every way out of the scan.

use std::sync::atomic::{AtomicBool, Ordering};

/// A flag that one holder has at a time. The sweep before each scan
/// ([`crate::sweep_stale`]) counts on it: it would remove the directory of a
/// scan that still runs.
#[derive(Debug, Default)]
pub struct SingleFlight {
    running: AtomicBool,
}

impl SingleFlight {
    /// The guard of the flight, or `None` while another guard lives.
    pub fn try_start(&self) -> Option<FlightGuard<'_>> {
        // One read-modify-write: of two callers at once, one gets the guard.
        if self.running.swap(true, Ordering::Acquire) {
            None
        } else {
            Some(FlightGuard { flight: self })
        }
    }
}

/// Holds the flight until it drops, also when it drops in a panic.
#[must_use = "the flight ends when the guard drops"]
#[derive(Debug)]
pub struct FlightGuard<'a> {
    flight: &'a SingleFlight,
}

impl Drop for FlightGuard<'_> {
    fn drop(&mut self) {
        self.flight.running.store(false, Ordering::Release);
    }
}
