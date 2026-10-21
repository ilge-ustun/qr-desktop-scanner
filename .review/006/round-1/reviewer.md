I’ll read the current page and its tests, then create a mutation for each acceptance criterion and run the targeted selectors. I’ll leave the checkout unchanged apart from `.review-out/`.

The new test file passes all 16 checks and covers the four criteria, including media-rule declarations and the accessibility attributes. I’ll now test it with deletions of the required behavior. I’m also checking that changes stay within the page sections allowed by the story.

No findings requiring changes.

| Criterion | Result and instrument |
|---|---|
| AC1 | Holds: warning first, live popover last. Tests check structure, references and painting-order declarations ([page](site/index.html:181), [instrument](src/__tests__/siteReadyPopover.test.ts:147)). |
| AC2 | Holds: labeled image, hidden parts, no focusable controls, required text ([page](site/index.html:183), [instrument](src/__tests__/siteReadyPopover.test.ts:188)). |
| AC3 | Holds: positioned scan bar, exact sweep, no other animations or transitions, and important reduced-motion override ([styles](site/index.html:104), [override](site/index.html:152), [instrument](src/__tests__/siteReadyPopover.test.ts:307)). |
| AC4 | Holds: shared grid cell, percentage widths, swapped sides, specified tilts and offset, clipped popover ([styles](site/index.html:83), [instrument](src/__tests__/siteReadyPopover.test.ts:371)). |

Seven deletion mutations are supplied with `.test` selectors in `.review-out/mutations/`. Each produced an assertion failure, covering all four criteria; none survived ([results](.review-out/mutation-results.txt:1)).

Scope checks found only the allowed page changes and new test file; surrounding page sections and `ready.png` remain unchanged ([scope evidence](.review-out/scope-check.txt:1)). The working tree is restored.

Visual layout, animation playback and VoiceOver remain human checks: the instrument explicitly tests declarations without layout, paint or cascade resolution ([limitation](src/__tests__/siteReadyPopover.test.ts:3)).

VERDICT: PASS
