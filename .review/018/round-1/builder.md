I've implemented story 018 on `story/018` in three commits. All qr-core tests pass, clippy and `cargo fmt --check` are clean, and `scripts/check-macos-shell.sh` lints the shell for macOS with no warnings. I did not run the full baseline; the harness runs it.

**Commits**
- `13aa7fe` — The sweep. `sweep_stale(scratch)` in `core/src/scan.rs` removes only the directories directly under `scratch` whose names start with `SCAN_DIR_PREFIX`. `temp_dir` uses the same constant. The sweep does not follow links, and it ignores every error. `run_scan` and `run_find_all` call it just before `temp_dir`. In the shell, `setup` in `src-tauri/src/lib.rs` calls it once on `app_cache_dir()`, before the tray and the hotkey exist, so no live scan can be swept.
- `ae86205` — The flag. `SingleFlight` is in the new file `core/src/single_flight.rs`, and `try_start` is one atomic `swap`. Its guard clears the flag in `Drop`. `ScanState` now holds a `SingleFlight`. `scan()` holds the guard in a block that ends when the outcome is back, so the flag clears at the same point as before. No swap or store is left in `src-tauri/src/scan.rs`.
- `622ab46` — Test changes. The two scan tests now check what the capture saw before they check the outcome. This makes a sweep moved to after the capture fail with "stale at capture". I also added tests for cases a reviewer could probe:
  - a `scan-*` file is kept;
  - `scan-*` directories nested under scratch, or next to it, are kept;
  - a link inside a stale scan does not lead the sweep out of scratch;
  - a scratch that is a file is not an error;
  - a scan directory that cannot be removed does not stop the sweep;
  - a refused start leaves the flight with its holder;
  - of 8 threads that start at once, only 1 gets the guard.

**Mutations:** there are nine pairs in `.review-out/mutations/`: three for AC1, two for AC2, one for AC3 and three for AC4. I made them with `git diff` after the last commit. Each patch applies to HEAD, and each selector goes red on an assertion, not on a compile error. I also checked the other "Goes red when" items, and each went red:
- the sweep after the capture, for both scans;
- the sweep after `temp_dir`: the fake cannot write into its removed directory;
- removing every entry, or every directory;
- `expect` on `read_dir`;
- a `load` then `store` in `try_start`: 4 of the 8 racing threads got a guard.

The tree is clean apart from `.review-out/`.

**Not tested here (from the story's known weaknesses):**
- The two shell edits only compile and lint here. A person on a Mac must run the story's Human verification checks.
- The 8-thread race test catches a `load` then `store` `try_start` only by timing. Reading the code shows `try_start` is one atomic swap.

I saw no unrelated problems.
