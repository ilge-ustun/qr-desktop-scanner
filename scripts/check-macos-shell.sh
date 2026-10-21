#!/usr/bin/env bash
# Lints the Tauri shell as macOS compiles it, from any OS.
#
# The shell's macOS code (src-tauri/src/platform/macos.rs and everything
# behind cfg(target_os = "macos")) only compiles for a macOS target. On a Mac
# this is plain clippy. Elsewhere it runs clippy for aarch64-apple-darwin:
# that type-checks every line, but never links, so no Mac SDK is needed --
# except that one dependency (objc2-exception-helper) compiles a small
# Objective-C file in its build script. A stand-in compiler writes an empty
# object for it; nothing built here is ever run or shipped.
#
# Needs: the Rust toolchain (rustup, cargo) and `ar`. Run `npm run build`
# first: the shell embeds dist/ at compile time.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"

if [[ "$(uname -s)" == "Darwin" ]]; then
  exec cargo clippy -p qr-desktop-scanner --all-targets -- -D warnings
fi

target=aarch64-apple-darwin
rustup target list --installed | grep -qx "$target" || rustup target add "$target"

stub="$(mktemp -d)"
trap 'rm -rf "$stub"' EXIT
cat > "$stub/cc" <<'STUB'
#!/bin/sh
# cc-rs probes the compiler family with -E: answer as the host compiler does.
case " $* " in *" -E "*) for last; do :; done; exec cc -E "$last";; esac
out=""
while [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done
# Any other probe (such as -?) must fail, or cc-rs decides this is MSVC.
[ -n "$out" ] && exec cc -c -x c /dev/null -o "$out"
exit 1
STUB
chmod +x "$stub/cc"

CC_aarch64_apple_darwin="$stub/cc" AR_aarch64_apple_darwin=ar \
  cargo clippy -p qr-desktop-scanner --target "$target" --all-targets -- -D warnings
