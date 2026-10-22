I’ll read the implementation and its tests, then write mutations for each acceptance criterion and run the targeted selectors.
The targeted tests pass. They assert all the named AC cases, including the card’s exact headline text. I’ll now check that removing the warning logic, domain substitution, suffix handling, or first-label guard makes the corresponding tests fail.
- **AC1 holds.** The instrument checks one danger warning, both names, all seven labels, duplicate suppression, and `openable: true` (`src/__tests__/urlSafety.test.ts:74`). Deleting the check makes it fail (`.review-out/logs/AC1-delete-check.json:1`).
- **AC2 holds.** Instruments assert the registrable domain for all four suffixes and exact card headline text (`src/__tests__/urlSafety.test.ts:88`; `src/__tests__/ResultCard.test.tsx:26`). Returning the full hostname fails both instruments; ignoring suffixes also fails (`.review-out/logs/AC2-full-host.json:1`; `.review-out/logs/AC2-ignore-suffixes.json:1`).
- **AC3 holds.** The instrument asserts the complete assessment for all six ordinary hosts (`src/__tests__/urlSafety.test.ts:97`). Removing the first-label guard makes it fail (`.review-out/logs/AC3-first-label.json:1`).

No scope violation or additional regression found. The added constants and check occupy the permitted source file (`src/lib/urlSafety.ts:34`, `src/lib/urlSafety.ts:132`), and existing warning checks remain independent (`src/lib/urlSafety.ts:97`). Mutation patches and selectors are under `.review-out/mutations/`; no probes were added.

VERDICT: PASS
