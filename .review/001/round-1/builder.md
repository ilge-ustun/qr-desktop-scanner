Story 001 is built in two commits on `story/001`. The new tests and lint pass, `npm run build` passes, and the tree is clean apart from `.review-out/`. The rest of the harness baseline (cargo clippy/test, `check-macos-shell.sh`, `cargo fmt`) I left to the harness; no Rust changed.

**Commits**
- **`44da66e` Read vCard and MECARD codes into contacts.** The parsers are in `src/lib/contact.ts`. `classify` has two new branches before the link branch: a contact code that parses becomes kind `"contact"`, and one that doesn't becomes `"text"`. So F3 is no longer a Link card. This covers AC1 and AC2. Edge-case tests (folding with a tab, property names in any case, `\N`, an empty FN falling back to N, quoted parameters, a missing final `;;`) are in `src/__tests__/contact.test.ts`.
- **`5ce1608` Contact card.** In `src/components/ContactCard.tsx`, the name is the `.headline`. Each phone, email, organisation and website gets its own row: a small Silkscreen name (Phone, Email, Organisation, Website), the value in `.mono`, and its own Copy. This covers AC3 and AC4.

**Choices the story left to me**
- **Label:** the new kind is labelled "Contact".
- **The name gets a Copy**, as a "Copy name" button at the bottom of the card, like Wi-Fi's "Copy password".
- **Field shape:** every field is a list (`phones`, `emails`, `organisations`, `websites`), because a vCard can repeat any of them. A repeated value is listed once and empty values are skipped.
- **Organisation:** an ORG made of parts (`Acme;Marketing;`) is shown as "Acme, Marketing", with empty parts dropped.
- **"Copied":** it shows on the last button clicked only. A second click on the same button restarts its 1.5 s.
- **Accessibility:** each row's Copy button is linked to its value with `aria-describedby`, so a screen reader can tell the buttons apart. The value is not in the button's label.

**Proof the tests catch things**
- Every "Goes red when …" change in the story turns its AC's tests red. I made each change, ran the tests and undid it.
- The four patches in `.review-out/mutations/` were written from the final commit and apply to it cleanly:

| AC | Patch | What it removes | Selector |
|---|---|---|---|
| AC1 | `AC1-tdd-unfold` | unfolding | `src/__tests__/payload.test.ts -t "AC1"` |
| AC2 | `AC2-tdd-mecard-falls-through` | a MECARD that fails falls through to the link branch | `src/__tests__/payload.test.ts -t "AC2"` |
| AC3 | `AC3-tdd-generic-card` | contacts are sent to the generic card | `src/__tests__/ResultCard.test.tsx -t "AC3"` |
| AC4 | `AC4-tdd-inner-html` | the name is rendered as HTML | `src/__tests__/ResultCard.test.tsx -t "AC4"` |

I also added tests for the cases a reviewer is likely to try:
- "Copied" moves to the button clicked next, and a second click restarts its time.
- A failed copy shows its error.
- Dismissing the card while a copy is running logs no error.
- F1 and F2 get the text card.
- A contact with only a name shows just the name and "Copy name".
- V2's organisation keeps its line break.

**For the person checking on a Mac**
- The new CSS (the `.field` rules in `src/styles.css`) uses only the two inks and square corners, and puts no Silkscreen on any value. Tests can't see fonts, so read that diff and look at the card.
- The row layout, wrapping, and "Copied" on the clicked button are on the story's human-verification list.

One unrelated thing I left alone: the existing generic card's "Copied" does not restart its timer on a second click.
