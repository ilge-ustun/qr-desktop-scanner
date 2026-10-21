Download the `.dmg` below, open it and drag **QR Scanner** to Applications. It runs on Apple Silicon and Intel Macs, macOS 12 or later.

**First launch.** This build is not signed with an Apple Developer ID yet, so macOS blocks it the first time ("Apple could not verify…"). Click **Done**, then open *System Settings → Privacy & Security*, scroll down and click **Open Anyway** next to QR Scanner. From then on it opens normally.

**Screen access.** The first scan asks for Screen Recording permission: switch QR Scanner on under *Privacy & Security → Screen & System Audio Recording*, then quit it (right-click the menu-bar icon → Quit) and open it again. After installing a new version you may need to allow it again.

Press **⌘⇧2** anywhere, or click the QR icon in the menu bar, and drag a box around a code.

**Check the download (optional).** `SHA256SUMS.txt` lists the DMG's SHA-256; compare with `shasum -a 256 QR-Scanner-*.dmg`. To check that the DMG was built by this repository's release workflow from this tag: `gh attestation verify QR-Scanner-*.dmg -R ilge-ustun/qr-desktop-scanner`.
