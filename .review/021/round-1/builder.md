Story 021 is implemented in two commits on story/021. The bit rule is proven by Rust tests. That the popover now really shows over a full-screen app was not observed: only a person on a Mac can check that, with the story's "Human verification" list.

**Commits**
1. `9be4977`: the new module `core/src/window.rs` (`pub mod window;` in `core/src/lib.rs`). It has `popover_collection_behavior(current: u64) -> u64` and the five constants, each with its AppKit name in the doc comment. There is no `cfg(target_os)` and no new dependency. The tests are in `core/tests/window.rs`:
   - AC1: the 11 rows, as literal numbers.
   - AC2: the 61 rows, as literal numbers.
   - Four more tests for cases a reviewer can try: the story's three single-bit examples; the result always has Auxiliary without Primary or None, and CanJoinAllSpaces without MoveToActiveSpace; using the function twice gives the same result as once; the constants have AppKit's values.
2. `5c641af`: the shell.
   - `platform::join_full_screen_spaces` in `macos.rs` gets the NSWindow from `ns_window()`, sends its bits through the qr-core function and writes the result back. The shell names no flag of its own. An error or a null pointer makes it stop with no change: there is no `unwrap` and no panic. The `unsafe` block has a `// SAFETY:` comment.
   - The stub in `unsupported.rs` does nothing.
   - `setup` in `lib.rs` calls it once, with `"main"`, before `popover::show`. Nothing changes the window level.
   - `src-tauri/Cargo.toml` adds `objc2-app-kit` 0.3.2 for macOS only, with no default features. In Cargo.lock, one line changed: `"objc2-app-kit"` in the `qr-desktop-scanner` dependencies. No package was added. The vitest test that reads Cargo.lock passes.

**What I saw**
- **Red first:** before the module existed, the test did not compile. With a function that returned its input unchanged (what the window does today), 4 of the 6 tests failed: `0x0` gave `0`, not `0x101`. Then the real rule made all 6 pass.
- **"Goes red when" lists:** I tried all 13 changes from the two lists (8 for AC1, 5 for AC2). Each one made its criterion's test fail, and I committed none of them.
- **Mutation pairs** in `.review-out/mutations/`, made from the final head:
  - `AC1-tdd-full-screen-auxiliary`: bit 8 is not set. The test fails at `0x0`, which gives `0x1`.
  - `AC2-tdd-high-bits`: only the low 32 bits are kept. The test fails at `1 << 32`.
  
  Each selector passes before its patch and fails after it.
- **Shell lint:** `scripts/check-macos-shell.sh` passes. As a check, I put a type error in the new macOS code for one run, and the script found it. clippy for qr-core and `cargo fmt --check` are clean. I did not run the full baseline set.

The tree is clean apart from `.review-out/`.

**Things outside this story**
- Tauri's own `ns_window()` has an internal `expect("view to be installed in window")`. If that ever fails, the app panics inside Tauri, before my code can stop.
- The doc comment of `src-tauri/src/platform.rs` lists what the platform layer does, and that list now leaves out the new function. The file is on the denied list, so I did not change it.
