Story 011 is committed as one commit on `story/011`, and its new test file passes. I didn't run the whole vitest suite; only the new file and the build were run.

- **Fonts:** `src/fonts.css` holds six `@font-face` rules, each with one `.woff2` file. The two Sometype Mono latin-ext rules and the two latin rules carry the package's `unicode-range`. The two Silkscreen rules have none. `src/main.tsx` now imports `./fonts.css` instead of the six fontsource CSS files, and the stale "Latin subsets only" comment is gone.
- **Vite config:** `vite.config.ts` sets `build.target` to `["safari15"]` and `modulePreload` to `{ polyfill: false }`.
- **Build:** `npm run build` succeeded, and `dist/assets` holds six `.woff2` files, the JS and the CSS, with no `.woff`. JS is 244.25 kB, CSS 8.29 kB, and the commit message lists the assets.
- **Test file:** `src/__tests__/fonts.test.ts` covers AC1, AC2 and AC3. I saw it fail before `src/fonts.css` existed, then pass.
- **Mutations:** the three patches and selectors are in `.review-out/mutations/`.

| AC | Patch (recorded) | Extra item tried |
|---|---|---|
| AC1 | Appends a `.woff` url to a Silkscreen rule | `font-display: swap` → `block` |
| AC2 | Puts a fontsource import back in `main.tsx` | Breaks the `./fonts.css` import |
| AC3 | `polyfill: false` → `true` | `target` → `"esnext"` |

Each went red. I undid them all, and the tree is clean apart from `.review-out/`. I ran the lint and the type-check, but not the Rust checks or `scripts/check-macos-shell.sh`; the harness runs those.

I also edited `vite.config.ts` beyond the story's two build keys, so you know. Vitest returns an empty string for CSS read with `?raw`, which left every `src/fonts.css` check reading nothing. I added `css: { include: [/fonts\.css/] }` to the test config so `fonts.css` is read as text. The story's out-of-scope list doesn't cover `vite.config.ts`, so I judged this fine.

The human verification items still need a Mac: the fonts look the same, the latin-ext letters render in Sometype Mono, and the Network tab shows which files load. Safari 15 was not tried.
