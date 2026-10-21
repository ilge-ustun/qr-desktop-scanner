- Read `CLAUDE.md` first: the layout, where logic goes, the commands, and the
  product rules (QR content is untrusted; no network; the two-ink look;
  Silkscreen never for decoded text; no history).
- Rust is in `~/.cargo/bin`, not on your PATH. Start every shell that runs
  cargo with `export PATH="$HOME/.cargo/bin:$PATH"
  CARGO_TARGET_DIR="$HOME/.cache/fleet-cargo/qr-desktop-scanner"` — the
  shared target directory saves rebuilding every dependency in your tree.
- This box is Linux. The app runs only on macOS, so you cannot start it:
  never run `npm run tauri dev` or `npm run tauri build`. Build only `qr-core`
  for the host (`cargo test -p qr-core`, `cargo clippy -p qr-core ...`):
  `cargo ... --workspace` also builds the shell for Linux, which fails here
  for want of webkit2gtk. Check the shell with `npm run build` then
  `scripts/check-macos-shell.sh`, which lints it as macOS compiles it.
- Evidence is vitest. Every AC's instrument is a vitest test (a selector
  under `src/`): the fleet does not read cargo test results yet. Rust tests
  still run in the baseline and a red one vetoes, so keep them green and add
  them where Rust logic changes.
- Code that only macOS can run (anything under `cfg(target_os = "macos")`,
  `src-tauri/src/platform/macos.rs`) cannot be tested here. Keep it thin: put
  the logic in `core/` or `src/lib/` where a test reaches it, and list the
  macOS-only part under the story's human verification.
- The test environment as installed (vitest 5, jsdom 30,
  @testing-library/react 16): declare `vi.mock` at the top of a file, never
  inside a `describe`. jsdom has no `ResizeObserver`; `App.test.tsx` shows
  the stub. Mock `src/lib/ipc.ts` rather than `@tauri-apps/api`. Before using
  a testing-library or vitest API this repo has not used, read its type in
  node_modules.
- There is no deploy. Never push tags, create releases or touch GitHub Pages:
  a `v*` tag publishes a public release, and the human decides when.
