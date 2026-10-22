I’ll read the current docs and tests, check the acceptance criteria, and leave a mutation for each criterion for the harness to run.
The two documentation test files pass: 38 tests. The protected page blocks match the base character for character, and the changed paths are limited to the README, page, and new test file. I’ll now check that the tests reject deletions, an unflagged decoy example, and missing key-font styling.
All six acceptance criteria hold. The instrument is `src/__tests__/docsDescribeApp.test.ts`, which reads both documents through `?raw` and parses the page with `DOMParser` (lines 9–13).

| Criterion | Evidence | Instrument |
|---|---|---|
| AC1 | Steps name all kinds, keys, Open anyway and Find all (`site/index.html:207–209`). | `docsDescribeApp.test.ts:48–70` |
| AC2 | Decoy example names example.net; existing items remain (`site/index.html:219–223`). | `docsDescribeApp.test.ts:125–149` |
| AC3 | Keys are documented and wrapped in mono-styled `kbd` (`site/index.html:59`, `207–209`). | `docsDescribeApp.test.ts:232–287` |
| AC4 | Original checks remain; added checks cover cards, keys, whole-screen scanning and decoys (`README.md:72–100`). | `docsDescribeApp.test.ts:345–366` |
| AC5 | Opening and explanation cover the new behavior (`README.md:3–11`, `114–133`). | `docsDescribeApp.test.ts:378–414` |
| AC6 | Protected blocks match the base; resource and version guards are present (`.review-out/verification.txt:16–20`; `docsDescribeApp.test.ts:534–572`). | Same AC6 tests |

Fourteen mutations and their `.test` selectors are in `.review-out/mutations/`. Every mutation produced an assertion failure, including outright deletions, an unflagged decoy host, the wrong owner domain, and missing key-font styling (`.review-out/verification.txt:1–14`).

No scope violations found: only the two documents and new test changed; protected README sections remain exact (`.review-out/verification.txt:15–22`). The targeted documentation and existing page tests passed all 38 tests (`.review-out/verification.txt:23`). No additional regression identified; no probes submitted. The working tree is restored (`.review-out/verification.txt:24`).

VERDICT: PASS
