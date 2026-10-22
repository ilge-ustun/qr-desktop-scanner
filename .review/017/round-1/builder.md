Story 017 is committed (one commit) and the tree is clean apart from `.review-out/`. The 637 existing tests passed with the new hooks and CSS tokens in place, but I did not re-run the full suite after the last test-typing fixes. After those fixes, `npm run build` and `npm run lint` both ran clean and the 21 tests in `appHooks.test.tsx` passed. I did not run the cargo commands or `scripts/check-macos-shell.sh`; I changed no Rust and left them to the harness baseline.

- **CSS:**
  - New `:root` tokens are `--orange-faint`, `--orange-hover`, `--orange-light` and `--disabled-opacity`.
  - `.secret` and `.field` now share one rule for their five common declarations, and each keeps its own padding.
  - Nothing outside `:root` writes a colour literal or `0.55`.
- **Hooks:** the five hooks are in the new `src/hooks/` folder, and `App.tsx` calls each once, with no effect, state, listener or observer of its own. The viewfinder no longer has the `tone-ok` class.
- **Rejection:** the `screenPermission` rejection is now dropped, as `getHotkey`'s is.
- **Types:** `src/lib/scanState.ts` doesn't export its action type and is out of scope. The two hooks that take `dispatch` therefore derive it as `Parameters<typeof reduce>[1]`.
- **Tests:** they are in the new `src/__tests__/stylesTokens.test.ts` (AC1–AC3) and `src/__tests__/appHooks.test.tsx` (AC4–AC7).

**Red observations**
- Before the change, all 13 style tests failed.
- Before the change, 17 `appHooks` tests failed, including AC6 row 1 (the unhandled rejection).
- AC6 rows 2 and 3 and AC7 passed before the change, as the story says they should.

**Mutation checks**
- Each of the seven criteria has a patch and selector pair in `.review-out/mutations/`, made from the committed head.
- I did not run the classifier over the pairs.
- For AC7 I also dropped `+ 6` and the Esc `removeEventListener`; each turned the test red.
- I did not do the extra "one more listed item" check for AC1–AC6.

I found no unrelated problems to report.
