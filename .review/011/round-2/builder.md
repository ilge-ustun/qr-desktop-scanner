The finding is fixed: AC2 now goes red when `@import "@fontsource/silkscreen/latin-400.css";` is added to `src/styles.css`.

The AC2 glob reads every stylesheet under `src/` as text, but vitest blanked every CSS file except `fonts.css`. So `styles.css` was always read as empty, and the "no fontsource outside `fonts.css`" check could never see it. I widened `css.include` in `vite.config.ts` from `/fonts\.css/` to `/\.css/`, so all CSS is read as text.

- **Red first:** I added the `@import` to `styles.css` before the fix and the AC2 test stayed green. After the fix it failed on "mentions @fontsource/ only in src/fonts.css". I then reverted the mutation.
- **Suite:** the full vitest run passes (20 files, 396 tests).
- **Commit:** one commit, `The fonts test reads every stylesheet under src as text, so a fontsource import added to styles.css is caught`.
- **Mutation pairs:** I wrote the three `tdd-` patches and selectors in `.review-out/mutations/` after the commit. They are a `.woff` fallback added to a font rule (AC1), the `styles.css` `@import` (AC2) and `polyfill: true` (AC3). I did not run the classifier on them, and I did not run the other items from the story's "Goes red when" lists this round.
- **Not re-run:** I did not run the build, lint, or Rust checks; the harness does that.

I changed `vite.config.ts` beyond the story's two `build` keys (the `css.include` line), which was already in the previous round. The scope deny list does not cover that file.
