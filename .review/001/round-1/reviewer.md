I’ll read the current implementation and tests, check the acceptance criteria with targeted runs, and leave mutation files for the harness.
The tests cover all four criteria through `classify` and `ResultCard`, including the exact fixtures, callback arguments, button lists, and decoded-text checks (`src/__tests__/payload.test.ts:90–107`, `src/__tests__/ResultCard.test.tsx:94–189`). I’ll now remove specific behaviors to verify that those instruments fail. The contact CSS preserves the mono font; its value-specific rule only adds whitespace preservation (`src/styles.css:330–338`, `src/styles.css:395–398`).
All four acceptance criteria hold; no blocking finding.

- **AC1:** Exact equality tests prove V1, V2 and M1 classify with the required fields (`src/__tests__/payload.test.ts:91–100`). Removing unfolding, comma unescaping or the vCard branch produces assertion failures (`.review-out/mutation-results.json:2–18`).
- **AC2:** Tests cover F1–F3 classification and F3’s Text label, complete button list and raw Copy argument (`src/__tests__/payload.test.ts:103–106`, `src/__tests__/ResultCard.test.tsx:95–102`). Removing the closure check, name validation or MECARD text fallback produces failures (`.review-out/mutation-results.json:20–36`).
- **AC3:** The instrument checks initial callback inactivity, headline, every button, per-click invocation counts, exact copied values and continued absence of opening (`src/__tests__/ResultCard.test.tsx:142–166`). Deleting contact routing or replacing field-copy values produces failures (`.review-out/mutation-results.json:38–48`).
- **AC4:** The instrument checks decoded-value classes, button/meta exclusion, absence of anchors and literal H1 markup (`src/__tests__/ResultCard.test.tsx:126–138`, `src/__tests__/ResultCard.test.tsx:172–188`). Removing the mono class or rendering the name as HTML produces failures (`.review-out/mutation-results.json:50–60`). CSS retains the mono font (`src/styles.css:316–338`, `src/styles.css:395–398`).

The changed-file inventory contains no denied paths (`.review-out/scope.txt:1–9`). Existing test bodies are preserved verbatim (`.review-out/preservation.txt:1–2`), including dangerous-link and existing card behavior checks (`src/__tests__/payload.test.ts:11–17`, `src/__tests__/ResultCard.test.tsx:30–91`). No regression was identified in those paths.

Ten patch/selector pairs are ready in `.review-out/mutations/`; each caused a real test failure locally (`.review-out/mutation-results.json:1–62`). Visual font and layout verification remains the story’s stated human check.

VERDICT: PASS
