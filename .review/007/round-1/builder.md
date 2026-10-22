I've implemented story 007 in one commit, `8e40024` on `story/007`. The tree is clean apart from `.review-out/`. The new test file is `src/__tests__/docsDescribeApp.test.ts`, with 22 tests. Before the README and page changes, all 15 tests that check new content failed. The other 7 check that kept text is unchanged, so they passed then too. Now the full vitest suite passes (274 tests), including story 006's page tests unchanged. `tsc --noEmit` and eslint are clean on the new file. I didn't run `npm run build`, cargo or `check-macos-shell.sh`: no Rust or app code changed, and the harness runs them.

**What changed on the page (`site/index.html`)**
- **Step 1:** ⇧⌘2 is now in a `<kbd>` in the mono face; "Press" stays in Silkscreen. This is Evidence point 3, still yours to confirm.
- **Step 2:** adds "Or skip the box: **Find all on screen**, under Scan, looks for every code on all your displays."
- **Step 3:** names the seven kinds (link, text, Wi-Fi network, contact, phone number, SMS, location). It says you act with a click or a key (↩ copies, ⌘O opens, ⌘J joins), and that a link with a warning opens only from **Open anyway**. "Nothing happens until you click." is gone.
- **Checks list:** a new "Decoy domains" item after "Fake destinations", in the same pattern: `paypal.com.secure-login.example.net` starts with paypal.com but belongs to example.net.
- **One CSS rule:** `kbd { font: 600 0.95em var(--mono); }`.
- The head, hero (including the fine line), facts, first launch and footer are unchanged.

**What changed in the README**
- **Opening paragraph:** names Find all on screen, contacts, phone numbers, SMS and locations, and Open in Maps. It now says nothing happens "until you ask: a click, or a key on the card (↩ copies, ⌘O opens, ⌘J connects)". It also says a warned link opens only from Open anyway.
- **What to check:** the ten existing checks are word for word as before. Four checks are added: Find all on screen, the new cards, the keys, and the decoy host (where ⌘O only moves focus to Open anyway).
- **How it works:** new **Cards** and **Keys** bullets. The untrusted-content bullet now names decoy domains and says Rust checks only the scheme.

**Checking the tests**
- **Every red-case is caught:** I applied each "Goes red when" change from all six criteria (31 in all), plus an `@import`, a remote `url(` and a `kbd` rule set to the pixel font. Each one turned its criterion red, and none was committed.
- **Mutation patches:** six pairs are in `.review-out/mutations/`, one per criterion, made after the final commit. I applied each one to the head myself and its selector went red.
- **One open question from the story is answered:** jsdom keeps a `font` shorthand that holds `var()` as written. So the test sees `.steps .t`'s pixel font, and on the base it failed exactly at step 1's title.

**For you to decide or check**
- Step 1's ⇧⌘2 in the mono face next to "PRESS" (Evidence point 3).
- Whether the hero's popover copy should show Find all on screen. I left it as it was, as the story requires.
- `CLAUDE.md:50` and `AGENTS.md:50` still say "without a click". They're your files, so I didn't touch them.
- The rest of the human-verification list still needs a Mac and Safari.

**Unrelated, not changed:** the README still names `QR Scanner_0.1.0_aarch64.dmg` (line 54 before this change) and `v0.1.1` in Releasing, while `package.json` is at 0.1.2.
