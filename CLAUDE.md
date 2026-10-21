# QR Scanner

A macOS menu-bar app: the user drags a box around a QR code anywhere on the
screen and sees what it says, with Copy / Open / Connect. Tauri v2 (Rust) +
React + TypeScript. The README says what the app does; this file says how to
work on it.

## Layout

- `core/` — crate `qr-core`: decoding (rxing), the scan flow behind the
  `Capturer` / `ScreenPermission` traits, the URL guard, Wi-Fi validation.
  No Tauri, no macOS APIs: it builds and tests on any OS.
- `src-tauri/` — crate `qr-desktop-scanner`, the shell: tray, popover window,
  global shortcut, IPC commands. macOS-only code lives in
  `src/platform/macos.rs` behind `cfg(target_os = "macos")`, with a stub in
  `src/platform/unsupported.rs` so the shell compiles elsewhere.
- `src/` — the React popover. `src/lib/` holds the pure logic (payload kinds,
  URL safety, Wi-Fi parsing, view state, shortcuts); `src/__tests__/` the
  vitest tests.
- `site/` — the project page, published to GitHub Pages. Plain HTML.

## Where logic goes

Put logic where a test on Linux can reach it: `core/` (Rust) or `src/lib/`
(TypeScript). The shell only wires those to the OS. Anything that needs macOS
goes behind `cfg(target_os = "macos")` with a matching stub, and the story
says that part is checked only by `scripts/check-macos-shell.sh` (compiles,
lints) and by macOS CI and a person on a Mac (runs).

## Commands

Rust lives in `~/.cargo/bin`, which may not be on PATH:
`export PATH="$HOME/.cargo/bin:$PATH"` first.

```sh
npm ci
npx vitest run [file-or-pattern]        # frontend tests
npm run lint && npm run build            # eslint; tsc + vite build
cargo test -p qr-core                    # Rust tests
cargo clippy -p qr-core --all-targets -- -D warnings
cargo fmt --all --check
scripts/check-macos-shell.sh             # lints the macOS shell from any OS (after npm run build)
```

`cargo clippy` / `cargo test` on the whole workspace also build the shell for
the host, which on Linux needs Tauri's webkit2gtk packages.

## Rules

- **QR content is untrusted input.** Nothing opens, copies or joins without a
  click. Render it as text, never as HTML. Open is offered only for `http`,
  `https` and `mailto`, and `core::url_guard` checks the scheme again in Rust
  before anything opens. A new kind of action needs the same two checks.
- **No network calls** from the app, no analytics. The screenshot is deleted
  when the scan ends, whatever the outcome.
- **Look:** Risograph, two inks: Federal Blue `#3d5588` for text and buttons,
  Fluo Orange `#ff7477` for fills, the off-register shadow, the scan bar and
  highlights. Square corners. Silkscreen for the app's own words (title,
  labels, buttons); Sometype Mono for everything read from the code and for
  sentences. **Silkscreen has no lower case: never use it for a network name,
  URL, password or any decoded text.** Fonts are bundled from `@fontsource`;
  nothing loads at runtime.
- **No history** of scans: the human decided against it. Each card has an ×.
- Commits name the human only: no Co-Authored-By or model trailers.
