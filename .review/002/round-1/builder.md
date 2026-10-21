Story 002 is built in two commits on `story/002`. All 135 vitest tests pass, and lint, `tsc` and `npm run build` are clean. I didn't run the full baseline. Rust is untouched, so I didn't run cargo or `check-macos-shell.sh`.

**Commits**
- `23928e8` **Read sms:, SMSTO: and geo: codes.** New parsers in `src/lib/sms.ts`, `src/lib/geo.ts` and `src/lib/query.ts`, which holds the percent-decoding that never throws. `classify` gets the new kinds `sms` and `geo`, checked before the link test and allowing spaces. A code with no number or no coordinates (E1–E3) falls through to the card it gets today, kind `"url"`.
- `dba1d33` **The cards.** `PhoneCard`, `SmsCard` and `GeoCard` sit on a shared `FieldCard`, which I drew out of `ContactCard`. Every Copy, including the headline's, has an `aria-describedby` pointing at the value it copies. There is no Call or Send. Open in Maps is a button that calls `onOpen` with the link the parser built from the two checked numbers; there is no `<a>` anywhere.

**My choices where the story left them to me**
- **Labels:** "SMS" and "Location".
- **Headlines:** the number on phone and SMS cards. On geo cards, the place (`q`) when there is one, otherwise the coordinates.
- **G3** shows "Opera House" as the headline, with the coordinates in a row below.
- **A1** doesn't show `0,0`: in Android's search form it means "no place". I added a `search` flag to the geo parser for this. Without it, the card couldn't tell the search form from coordinates that are just invalid, since both have no Maps link. A test covers `geo:999,0?q=Dam`, which keeps its coordinates.
- **Empty `tel:`** gets the generic card it gets today, the same fallback as Wi-Fi without a network name.
- **Contact card:** its "Copy name" button now also has an `aria-describedby`. Nothing else about it changed, and story 001's tests pass unmodified.

**Checking my own tests**
- I applied every "Goes red when…" item in the story, 32 in all, one at a time. Each one turned its criterion's test red for the reason the story gives.
- The five `tdd-` patches and their selectors are in `.review-out/mutations/`. They were produced at head `dba1d33`, each applies cleanly and turns its selector red, and every selector is green at head.
- Beyond the criteria, I added tests for: two cards on screen at once, Open in Maps clicked twice, a failed open showing its error, dismissing while Maps is still opening, Dismiss neither copying nor opening, and "Copied" showing on the clicked button only.

**Gaps in the spec**
- **`+` in `q`** is kept as a literal `+`. Android uses it for a space (`q=1600+Amphitheatre`), so such a place will show with plus signs.
- **Parameter names** `body` and `q` match in any case.
- **Fonts and screen layout** can't be seen by jsdom. I changed no CSS: the new cards reuse the contact card's classes, so `.mono` and `.headline` stay in Sometype Mono. A person on a Mac still needs to look.

The working tree is clean apart from `.review-out/`, which is gitignored. I touched no denied paths and didn't push.
