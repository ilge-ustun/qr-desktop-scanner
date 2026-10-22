**New in 0.2.0**

- **More kinds of code.** A contact (vCard or MECARD) shows the name with a Copy for each phone, email, organisation and website. A phone number, an SMS and a location each get their own card; a location with valid coordinates also offers **Open in Maps**. Nothing is called, sent or added to Contacts.
- **Find all on screen.** Under Scan, or in the menu-bar icon's right-click menu: finds every code on all your displays, with no box to drag.
- **Keys on a card.** ↩ copies, ⌘O opens a link with no warnings, ⌘J joins a Wi-Fi network. A link with a warning still opens only from **Open anyway**.
- **Decoy domains.** `paypal.com.secure-login.example.net` starts with paypal.com but belongs to example.net, and the card now says so.
- **More link warnings.** A link to this Mac or to your local network (`localhost`, `.local`, private IP addresses) gets a warning. So does a mail link that adds hidden recipients (`cc`, `bcc`). The decoy warning now names the right owner for addresses such as `paypal.com.evil.co.kr`.
- **Fixes.** If the app crashes or is forced to quit during a scan, it deletes the screenshot it left at the next scan or launch. If System Settings does not open, the app says why. If a new shortcut cannot be saved, the popover shows "Not saved: …" and the old shortcut stays.
- **Fewer permissions.** The popover can use only the three app functions it needs: scan events and the clipboard.
- **Smaller app.** The decoder no longer includes image formats it does not use, and each font ships once.

Download the `.dmg` below, open it and drag **QR Scanner** to Applications. It runs on Apple Silicon and Intel Macs, macOS 12 or later.

**First launch.** This build is not signed with an Apple Developer ID yet, so macOS blocks it the first time ("Apple could not verify…"). Click **Done**, then open *System Settings → Privacy & Security*, scroll down and click **Open Anyway** next to QR Scanner. From then on it opens normally.

**Screen access.** The first scan asks for Screen Recording permission: switch QR Scanner on under *Privacy & Security → Screen & System Audio Recording*, then quit it (right-click the menu-bar icon → Quit) and open it again. After installing a new version you may need to allow it again.

Press **⌘⇧2** anywhere, or click the QR icon in the menu bar, and drag a box around a code.

**Check the download (optional).** `SHA256SUMS.txt` lists the DMG's SHA-256; compare with `shasum -a 256 QR-Scanner-*.dmg`. To check that the DMG was built by this repository's release workflow from this tag: `gh attestation verify QR-Scanner-*.dmg -R ilge-ustun/qr-desktop-scanner`.
