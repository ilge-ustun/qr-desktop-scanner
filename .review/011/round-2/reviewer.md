I’ll read the current implementation and its tests, then leave a harness-ready mutation for each acceptance criterion. I’ll use the supplied baseline results without rerunning those checks.
All eight tests in `fonts.test.ts` pass. They check the six font declarations and file paths, scan the required source files for fontsource references, and inspect the exported Vite config. I’ll now test whether removing those behaviors—and adding back the old imports—produces assertion failures.
All 18 mutations produced assertion failures, including deleting a font face, removing the stylesheet import, and deleting the build options. The stylesheet `@import` mutation also failed as required. I’ll leave the patches and selectors under `.review-out/` and remove the temporary reporter output.
- **AC1 holds.** The six faces use single woff2 sources and the required ranges (`src/fonts.css:5–55`). The instrument checks rule exclusivity, face identity, file existence and package ranges (`src/__tests__/fonts.test.ts:49–86`). Eight mutations produced assertion failures (`.review-out/mutation-results.txt:1–8`).
- **AC2 holds.** Main imports the stylesheet (`src/main.tsx:5`). The instrument checks the required domain, rejects other fontsource references and requires an uncommented import (`src/__tests__/fonts.test.ts:89–118`). All five mutations failed, including deleting the import and restoring CSS imports (`.review-out/mutation-results.txt:9–13`).
- **AC3 holds.** The config specifies Safari 15 and disables the polyfill (`vite.config.ts:11`). The instrument deep-compares both exported values (`src/__tests__/fonts.test.ts:121–130`). All five mutations failed, including deleting the entire build entry (`.review-out/mutation-results.txt:14–18`).

No scope violation: changed paths are limited to the stylesheet, entry point, test and Vite config (`.review-out/changed-files.txt:1–5`). The supplied build log lists all six woff2 assets (`/home/fleet/work/projects/qr-desktop-scanner/.review/011/round-2/baseline/build.log:11–16`).

No additional regression found in the reviewed changes. Visual rendering remains outside the text-based instrument’s evidence (`src/__tests__/fonts.test.ts:3`). Harness-ready patches and selectors are under `.review-out/mutations/`.

VERDICT: PASS
