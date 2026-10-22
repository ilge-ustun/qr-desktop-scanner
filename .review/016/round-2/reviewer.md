I’ll read the current implementation and instruments, then write a harness mutation for each acceptance criterion. I’ll leave all review artifacts under `.review-out/`.

The ten relevant test files pass: 182 tests. The new instruments cover the specified tables, call counts and AST checks. Next I’ll verify that each instrument rejects a mutation, run the Wi-Fi table against the base, and compare additional parser edge cases.

All seven mutations caused assertion failures in their selected instruments. The 50 Wi-Fi table assertions also pass against `efdac6e`, and 75,000 generated parser comparisons found no output differences. No regression probe was needed; I’m finishing the scope check and artifact audit.

All seven acceptance criteria hold. Each named instrument asserts the required behavior and rejects its supplied mutation with assertion failures.

| AC | Instrument and coverage | Mutation result |
|---|---|---|
| AC1 | Prefix table, including case, empty rest and Unicode exclusions: `src/__tests__/text.test.ts:7` | Returning null outright: 5 failures (`.review-out/AC1-remove-prefix.log:13`). |
| AC2 | AST checks for literals, regexes, seven calls and finder validation: `src/__tests__/parserSources.test.ts:147` | Restoring inline tel detection: 3 failures (`.review-out/AC2-inline-tel.log:11`). |
| AC3 | Mock counts duplicates, own prefixes and all seven on fallback paths: `src/__tests__/prefixOnce.test.ts:45` | Repeating WIFI detection: 13 failures (`.review-out/AC3-repeat-wifi.log:21`). |
| AC4 | Exact parser and classify assertions for the specified rows: `src/__tests__/wifiTable.test.ts:19`, `src/__tests__/wifiTable.test.ts:45` | Skipping colonless fields: 4 failures (`.review-out/AC4-skip-colonless.log:12`). |
| AC5 | Shared imports, backslash restrictions and finder validation: `src/__tests__/parserSources.test.ts:180` | Local Wi-Fi unescape regex: 1 failure (`.review-out/AC5-local-unescape.log:9`). |
| AC6 | All five query cases: `src/__tests__/query.test.ts:7` | Removing caller-name normalization: 3 failures (`.review-out/AC6-case-sensitive-name.log:11`). |
| AC7 | Export usage, exclusion of new tests and finder validation: `src/__tests__/parserSources.test.ts:202` | Re-exporting HeadlineSize: 1 failure (`.review-out/AC7-unused-export.log:9`). |

No scope violation found: changed paths are confined to the five new tests and permitted library modules (`.review-out/changed-files.txt:1`). The restricted urlSafety content comparison checks that only its two specified exports changed (`.review-out/independent.cjs:23`).

No additional regression found in the generated comparisons of Wi-Fi, MECARD and classify outputs against the base; the reproducible comparison covers escapes, delimiters, Unicode and trailing fields (`.review-out/independent.cjs:12`). Wi-Fi retains both colonless-field behaviors and documents why (`src/lib/wifi.ts:25`, `src/lib/wifi.ts:36`).

Seven patch/selector pairs are under `.review-out/mutations/`; the generator restores each source file after testing (`.review-out/check-mutations.py:16`, `.review-out/check-mutations.py:21`).

VERDICT: PASS
