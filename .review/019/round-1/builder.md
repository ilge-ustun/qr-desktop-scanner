Story 019 is done: four commits on `story/019`, and the tree is clean apart from `.review-out/`. Only the four files the story allows changed: `core/src/scan.rs`, `core/src/lib.rs`, `core/tests/pipeline.rs` (new) and `src-tauri/src/scan.rs`.

**Commits**
1. `fbdcc05` adds `ScanError`, with today's five texts and `From` into `ScanOutcome`. `temp_dir` now creates a missing scratch with `create_dir_all`. One private step, `decode_shots`, opens and decodes the shots for both flows. It skips a missing file, gives `NoScreenshot` when no file is left, and reports a code once by its text. Both flows share the permission, sweep and temp-dir steps through one helper, and errors pass on with `?`. `fn error(` is gone.
2. `a8f8b82` adds `qr_core::run` and the two outcome methods, `asks_for_permission` and `reopens_popover`.
3. `8ab2096` makes the shell call `qr_core::run` after `HIDE_SETTLE`, and use the two methods in today's order. The shell no longer has `create_dir_all`, `match` on the Scope, comparisons with outcome variants, or `fn error(`. The early permission check, `no cache directory: …` and `the scan stopped unexpectedly: …` stay in the shell with today's text.
4. `eded297` adds two more tests:
   - a granted area scan whose capturer returns `Ok(Capture::Cancelled)` gives Cancelled and decodes nothing. The story says no test covered this, and my change rewrote that line.
   - a find-all whose capturer reports no display gives `no screenshot was written`.

   I also added a test that a scan without the permission does not create the scratch directory.

**Red first**
- Before the code changed, the new tests did not compile.
- With only the `ScanError` type added, the AC1, AC4 (scratch case) and AC5 tests failed as the story says they fail on today's tree.
- A stub `run` and two methods that give constants made the AC2 and AC3 tests fail.

**Checks run here**
- `cargo test -p qr-core` passes, with all the existing test files unchanged.
- clippy on qr-core and `cargo fmt --check` pass.
- `npm run build` and `scripts/check-macos-shell.sh` pass: the shell compiles and lints clean for aarch64-apple-darwin.
- I did not run the full baseline. The harness runs it.

**Mutations:** five pairs are in `.review-out/mutations/`, one per AC. I made them after the last commit. Each one made its selector fail, and each patch applies to HEAD. I also tried one more "Goes red when" item for each AC, and two for AC4; all of them made their test fail.

**Not tested here:** the shell's wiring and the changed order when the scratch directory cannot be created (Evidence 5). Only the story's human checks on a Mac show these.

I found no problems outside the story's scope.
