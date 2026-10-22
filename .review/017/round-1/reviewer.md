I’ll read the current files and tests, check each criterion, and leave a targeted mutation for each one for the harness to run.
The current hooks match the requested split, and the tests contain instruments for all seven criteria. I’ll now test whether those instruments catch removed behavior, including rejection handling and cleanup during StrictMode’s mount/unmount cycle.
All seven criteria hold. The targeted tests passed: 34 tests, zero failures (`.review-out/evidence.txt:1`).

| Criterion | Instrument and evidence |
|---|---|
| AC1 | Checks all five token substitutions, literal values and shared opacity token (`src/__tests__/stylesTokens.test.ts:61`). |
| AC2 | Checks forbidden literals outside `:root` and exactly one opacity token (`src/__tests__/stylesTokens.test.ts:88`). |
| AC3 | Checks shared declarations and separate padding (`src/__tests__/stylesTokens.test.ts:109`). |
| AC4 | Checks the viewfinder’s exact class (`src/__tests__/appHooks.test.tsx:68`). |
| AC5 | Checks five hook calls, named imports and absence of effects in App (`src/__tests__/appHooks.test.tsx:78`). |
| AC6 | Checks both rejections and permission resolving false (`src/__tests__/appHooks.test.tsx:129`). |
| AC7 | Checks StrictMode listener cleanup, observer cleanup and height calculation (`src/__tests__/appHooks.test.tsx:162`). |

Left 13 mutation patches with `.test` selectors in `.review-out/mutations/`. Every mutation produced an assertion failure, including deleting rejection handlers, permission dispatch and cleanup behavior (`.review-out/evidence.txt:3`).

No scope violations found in the changed-path inventory (`.review-out/evidence.txt:16`). The late listener-resolution race is guarded by the `gone` branch and its mutation fails (`src/hooks/useScanEvents.ts:18`, `.review-out/AC7-remove-late-unlisten.log:11`). No additional regression probe was warranted.

The checkout is unchanged outside the review artifacts (`.review-out/evidence.txt:26`).

VERDICT: PASS
