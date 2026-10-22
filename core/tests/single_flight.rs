use std::sync::{Arc, Barrier};
use std::thread;

use qr_core::SingleFlight;

#[test]
fn a_second_start_is_refused_while_a_guard_lives() {
    let flight = SingleFlight::default();
    let first = flight.try_start();
    assert!(first.is_some());
    assert!(flight.try_start().is_none());
    drop(first);
}

#[test]
fn a_dropped_guard_frees_the_flight() {
    let flight = SingleFlight::default();
    let guard = flight.try_start().expect("a new flight is free");
    drop(guard);
    assert!(flight.try_start().is_some());
}

#[test]
fn a_guard_held_by_a_panicking_thread_frees_the_flight() {
    let flight = Arc::new(SingleFlight::default());
    let holder = Arc::clone(&flight);
    let joined = thread::spawn(move || {
        let _guard = holder.try_start().expect("a new flight is free");
        panic!("holder panicked");
    })
    .join();
    // The thread got as far as the panic, so it held the guard then.
    let payload = joined.expect_err("the holder did not panic");
    assert_eq!(
        payload.downcast_ref::<&str>(),
        Some(&"holder panicked"),
        "the holder failed somewhere else"
    );
    assert!(flight.try_start().is_some());
}

#[test]
fn of_many_starts_at_once_one_gets_the_guard() {
    const THREADS: usize = 8;
    let flight = Arc::new(SingleFlight::default());
    // Every thread tries while the others are trying, and keeps what it got
    // until all have tried.
    let start = Arc::new(Barrier::new(THREADS));
    let tried = Arc::new(Barrier::new(THREADS));
    let threads: Vec<_> = (0..THREADS)
        .map(|_| {
            let (flight, start, tried) = (flight.clone(), start.clone(), tried.clone());
            thread::spawn(move || {
                start.wait();
                let guard = flight.try_start();
                tried.wait();
                guard.is_some()
            })
        })
        .collect();
    let got: usize = threads
        .into_iter()
        .map(|t| usize::from(t.join().unwrap()))
        .sum();
    assert_eq!(got, 1);
    assert!(flight.try_start().is_some());
}
