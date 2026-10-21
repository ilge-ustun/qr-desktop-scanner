Story 004 is built in seven commits on `story/004`, and the tree is clean apart from `.review-out/`. All 71 vitest tests pass, and so do tsc, eslint, `cargo fmt --check`, clippy and `cargo test` on `qr-core`, and `scripts/check-macos-shell.sh`. Per the rules I didn't run the full baseline or the classifier.

**Commits**
1. **Core** (`f749e6e`): adds `DisplaysCapturer` and `run_find_all` beside `run_scan`, plus a `Scope` enum that serializes to `"area"` / `"screen"`. `core/tests/find_all.rs` has 12 tests covering cases 1a–h. Two of them go beyond the story:
   - Codes are merged by text keeping the first occurrence, checked with a fake decoder so the kept format is visible.
   - The capture gets a fresh `scan-*` directory under `scratch`.

   I saw them fail against a stub. Leaking the temp dir turns all ten cleanup checks red.
2. **ipc** (`25775d2`): `findAllOnScreen` invokes `"find_all_on_screen"`, and `onScan` passes the scope from `scan://started` to its `started` handler. Tests are in the new `src/__tests__/ipc.test.ts` (AC3, AC5c).
3. **Scope and notice** (`97dde01`): `scanState` keeps the scope of the latest scan and puts it in the not-found view. After a find-all the notice reads: "Searched the whole screen and found no QR code. If one is small, Scan again and drag around just that code." After a drag scan it is the same sentence as before (AC5a/b).
4. **Button** (`8bd7105`): "Find all on screen" is an outlined `ghost` button right after Scan, disabled while any scan runs (AC1, AC2, AC4).
5. **Shell** (`21f47f9`):
   - `ScreencaptureDisplays` gets the display count from CoreGraphics (`CGGetActiveDisplayList`) and runs `screencapture -x` with one path per display, passed as arguments, with no shell and no `-i`.
   - The stub returns the macOS-only error.
   - `spawn_find_all` uses the same scan flow and the same one-scan-at-a-time flag, and both scans now send their scope with `scan://started`.
   - The `find_all_on_screen` command is registered, and the tray has "Find All Codes on Screen" with no shortcut.
6. **README** (`556e871`): one bullet under "How it works".
7. **Test** (`17bec63`): dismissing the middle of three cards leaves the other two in order.

**Mutation pairs** in `.review-out/mutations/`, written after the final commit: AC1, AC2, AC3 and AC4 have one each; AC5 has two, one for the page's sentence and one for the payload in `ipc.ts`. Each applies to HEAD and turns its selector red. For each criterion I also applied a second "Goes red when" item, and each one went red.

**One choice the story didn't settle:** if one display's image is missing but another's exists, core skips the missing one instead of failing. With mirrored displays, the system's display count may not match what `screencapture` writes, and failing would lose the codes on the main display. With no image at all, it is still an error, never a cancel.

**Not verified (needs a Mac):** the CoreGraphics count, how `screencapture` writes several files, and everything on the story's human checklist.

**Unrelated problems, not fixed:**
- **Shared cargo target dir:** another worktree rebuilt `qr-core` there 3 seconds after my edit, and cargo then treated its artifact as current for my tree. It fails silently and could affect the baseline too. I worked around it by touching my sources before each build.
- **"Try again" on the permission card** always starts a drag scan, even after a refused find-all. The story doesn't cover it, so I left it.
