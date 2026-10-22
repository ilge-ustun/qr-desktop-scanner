I’ll read the current files and test instruments, then create and run focused mutations for each acceptance criterion. I won’t rerun the full baseline checks.
The eight font tests pass. They check the face declarations, file existence, Unicode ranges, import domain, and build settings (`src/__tests__/fonts.test.ts:49`, `:89`, `:121`). I’m now running mutations that delete a face, remove the stylesheet import, and delete the build settings, along with the story’s other specified cases.
One required mutation survives: adding a fontsource `@import` to `src/styles.css` leaves all three AC2 tests green (`.review-out/results/summary.txt:13`). The domain glob requests CSS as raw text, but Vitest only includes `fonts.css` in CSS processing (`src/__tests__/fonts.test.ts:90`, `vite.config.ts:16`). I’ll leave the surviving mutation for the harness; AC2’s instrument does not cover the stated stylesheet case.
AC2 fails its required mutation check.

The story requires AC2 to go red when `@import "@fontsource/silkscreen/latin-400.css";` is added to `src/styles.css`. That mutation leaves all three AC2 tests green ([result](.review-out/results/summary.txt:13)). The test inventories CSS files but only `fonts.css` is included in Vitest’s CSS processing, so checking filenames does not establish that stylesheet contents were read ([glob](src/__tests__/fonts.test.ts:90), [configuration](vite.config.ts:16), [assertion](src/__tests__/fonts.test.ts:104)).

The reproducible mutation and selector are ready for the harness: [patch](.review-out/mutations/AC2-styles-fontsource.patch:1), [selector](.review-out/mutations/AC2-styles-fontsource.test:1).

- **AC1:** The implementation declares the six faces. Its instrument checks rule count, face identity, file existence, source format and Unicode ranges; all eight submitted mutations fail ([fonts](src/fonts.css:5), [instrument](src/__tests__/fonts.test.ts:49), [results](.review-out/results/summary.txt:1)).
- **AC2:** The stylesheet import is present, and removing or commenting it fails. Restoring fontsource imports in TSX also fails. The CSS-content coverage above remains absent ([import](src/main.tsx:5), [results](.review-out/results/summary.txt:9)).
- **AC3:** The required build settings are present. Its instrument imports the configuration and compares both values; all seven submitted mutations fail ([settings](vite.config.ts:11), [instrument](src/__tests__/fonts.test.ts:121), [results](.review-out/results/summary.txt:14)).

No out-of-scope file changes were found; the changed-file inventory contains only the stylesheet, entry point, configuration and new test ([inventory](.review-out/changed-files.txt:1)). No additional regression finding or probe is submitted.

VERDICT: FAIL
