# QR Scanner

A macOS menu-bar app that reads a QR code from anywhere on your screen — a
photo, a PDF, a paused video, a web page. Click the menu-bar icon (or press
**⌥⇧Q**), drag a box around the code, and it shows what the code says, with
**Copy** and **Open** — or, for a Wi-Fi code, the network with **Connect**
and **Copy password**. Nothing is copied, opened or joined until you click.

Tauri v2 (Rust) + React + TypeScript. macOS 12 or later.

## Try it on your Mac

One-time setup:

```sh
xcode-select --install                                           # Apple's compilers
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust
# Node 20 or later, e.g. `brew install node`
```

Then:

```sh
git clone git@github.com:ilge-ustun/qr-desktop-scanner.git
cd qr-desktop-scanner
npm ci
```

**Quick run (dev mode):** `npm run tauri dev`. The first build takes a few
minutes. A QR icon appears in the menu bar and the popover opens under it.
In dev mode macOS asks for Screen Recording on behalf of the app you ran the
command in (Terminal, iTerm, VS Code, Warp, …): allow it in *System Settings →
Privacy & Security → Screen & System Audio Recording*, then quit that app with
⌘Q, reopen it and run the command again. macOS lists an app there only after
it has asked for access: click *Open System Settings* in the popover (it asks
first), or add the app yourself with the **+** button under the list.

**The real app:** `npm run tauri build -- --bundles app`, then

```sh
open "target/release/bundle/macos/QR Scanner.app"
```

(or drag it to /Applications first). Allow *QR Scanner* under Screen
Recording, quit it (right-click the menu-bar icon → Quit) and open it again.
The build is ad-hoc signed, so after every rebuild macOS may ask for the
permission again. macOS 15 also re-confirms screen access from time to time.

An `.app` downloaded from the CI artifact is quarantined by Gatekeeper; clear
it with `xattr -dr com.apple.quarantine "QR Scanner.app"`.

### What to check

1. The popover opens at launch; no Dock icon; clicking elsewhere closes it.
2. Without the permission: the popover explains it, and *Open System
   Settings* goes to the right pane.
3. Scan a code in Preview (image), a PDF, a paused video, a web page.
4. Esc during the selection cancels quietly.
5. A box with no code says "No QR code found"; two codes give two cards.
6. Copy puts the exact text on the clipboard; Open launches the browser.
7. A `javascript:` code shows a warning and no Open button.
8. A Wi-Fi code shows the network name, the password hidden behind Show,
   and Connect joins it (System Settings → Wi-Fi shows it connected).
9. The popover is only as tall as its content.
10. ⌥⇧Q works while another app is in front.

## How it works

- **Selection** is macOS's own crosshair: `screencapture -i -x` (the
  ⌘⇧4 tool), so multiple displays, Retina and Esc behave as usual.
- **Decoding** is [rxing](https://crates.io/crates/rxing), a Rust port of
  ZXing. It finds several codes in one selection, rotated or light-on-dark.
  Apple Vision is planned as the primary decoder on macOS.
- **Screen Recording permission** is checked before every scan: without
  it, screencapture silently returns only the wallpaper.
- **QR content is untrusted.** The card shows the real domain on its own,
  warns on `http`, look-alike (punycode) hosts, bare IPs and link shorteners,
  and offers Open only for `http`, `https` and `mailto` — checked again in
  Rust before anything is opened.
- **Wi-Fi codes** are joined with macOS's own
  `networksetup -setairportnetwork`, after Rust checks the name and password
  against 802.11's limits. The password is passed as an argument, so for the
  second or two the join takes it is visible in `ps` to your own user.
- **Privacy:** no network access, no telemetry. The screenshot is written to
  a temporary folder in the app's cache directory and deleted as soon as it is
  decoded, whatever the outcome.

```
core/          qr-core: decoding, the scan flow, the URL guard. No Tauri and no
               macOS APIs, so it builds and tests on any OS.
src-tauri/     the Tauri shell: tray, popover, hotkey, IPC. macOS-only code is
               in src/platform/macos.rs; a stub keeps it compiling elsewhere.
src/           the React popover. lib/ holds the pure logic (payload kinds,
               URL safety, view state); __tests__/ its tests.
```

## Development

```sh
npm test                    # vitest: payload, URL safety, view state, result card
npm run lint && npm run build
cargo test -p qr-core       # decoding (generated QR fixtures), scan flow, URL guard
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings   # the shell needs macOS
                                                        # (or webkit2gtk on Linux)
```

`.github/workflows/macos.yml` runs all of this on a macOS runner, builds the
`.app` and uploads it zipped. It is manual (*Actions → macOS build → Run
workflow*) while the repository is private.
