Story 016 is implemented and committed as `11aae01`. The vitest suite passes (603 tests), `tsc --noEmit` is clean and eslint is clean. I did not run the cargo, `npm run build` or `check-macos-shell.sh` baseline steps, as instructed.

- **New module `src/lib/text.ts`:** it holds `afterPrefix` (ASCII-only case folding, so `ı` and `ſ` don't match), `splitUnescaped` (moved from contact.ts unchanged) and `unescapeBackslashes`.
- **Prefixes:** all seven now go through `afterPrefix` with a literal at the call. No regex or constant is left for any of them.
- **Prefix tested once:**
  - `classify` calls `parseWifiBody(rest)` and `parseMecardBody(rest)` after one `afterPrefix` each.
  - `parseWifi` and `parseMecard` keep the whole text as input and their own prefix test.
- **Wi-Fi parser:** it now splits on `;`, then on the first `:`, then unescapes, then unquotes. A comment keeps the two no-colon behaviours, as the story requires. The table in `wifiTable.test.ts` passed on the base before I changed `wifi.ts`, and every row matched the story's value, so no row needed a changed value.
- **`queryParam`:** it now lower-cases the name the caller passes.
- **Exports:** `export` is removed from the eight names (`percentDecoded`, `HeadlineSize`, `Recorded`, `Severity`, `Assessment`, `Field`, `View`, `Action`). `Warning` stays exported.

On the base, the new tests found the counts the story predicts: 7 string literals, 9 regexes, 4 backslash literals (3 in contact.ts, 1 in wifi.ts) and the 8 unused exports.

I wrote one mutation patch and selector per AC in `.review-out/mutations/AC1…AC7-tdd-*`, produced after the commit. I applied each one and the selector went red every time. I also ran a second item from each criterion's "goes red" list, and each went red too. Both checks were undone and the tree is clean.

One note: the repo has no Prettier config. I ran Prettier at width 120 on `src/lib` and reverted its formatting changes to lines I did not touch.
