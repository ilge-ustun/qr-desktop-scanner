Story 020 is done: five commits on `story/020`, and the six mutation pairs are in `.review-out/mutations/`. No changed file is on the deny list. I did not run the full baseline; the harness runs it. Apart from `.review-out/`, the tree is clean.

**Commits**
1. `6e0e3fe`: `qr_core::wifi::join_args` and `join_result` (AC1, AC2).
2. `a2bd506`: a new module `core/src/capture.rs` with `selection_verdict`, `display_count`, `display_files` and `open_settings_result` (AC3–AC6). `lib.rs` declares it.
3. `f160cdb`: `macos.rs` now calls these six functions, and the old inline rules are removed. `open_screen_settings` now uses `.output()`, so a failed `open` gives an error that includes its stderr. The six public items keep their names and signatures, so the stub still matches.
4. `0aa778e`: one shell error type in `src-tauri/src/error.rs`. It uses `thiserror`, and Cargo.lock is committed with it. It is serialized as its display text, so the page gets the same strings as before. No `map_err(|e| e.to_string())` remains in `commands.rs` or `hotkey.rs`. The four commands now return this type.
5. `a6cd892`: when `change` cannot save the new shortcut, it saves before it makes the shortcut current. If the save fails, it unregisters the new shortcut, registers the previous one again, and returns `Not saved: <save error>`. The tray item does not change.

**Tests**
- I saw each test fail to compile before I wrote the code. All 14 qr-core unit tests pass with `--locked`, and `scripts/check-macos-shell.sh` is clean after each shell commit.
- For each AC, I made one other change from its "Goes red when" list, and its test went red each time:
  - AC1: the SSID split on spaces.
  - AC2: stderr ignored.
  - AC3: exit 1 not taken as a cancel.
  - AC4: `Ok(0)` for zero displays.
  - AC5: `1..count`.
  - AC6: only the first line of stderr kept.
- I wrote the tdd- patches after the last commit. Each one applies to HEAD and turns its selector red, and each selector passes with no patch. The selectors are `cargo:qr-core/lib::{wifi,capture}::tests::…`.
- One extra test: `join_args` passes an SSID with spaces around it, and a password of one space, through unchanged.

**What no test here checks**, as the story says:
- that `macos.rs` calls the core functions (read the diff);
- the error strings and the shortcut rollback in the shell (a person on a Mac checks them);
- the stub, which no build compiles.

**Not fixed (outside this story):**
- A failed save in `change` can still leave the old shortcut unregistered, because `resume` drops the result of `register` (Evidence 7).
- The page still ignores a failed Open Settings (Evidence 3).
