I’ll read the current implementation and the five instruments, then create a targeted mutation for each acceptance criterion. I’ll leave only review artifacts under `.review-out/`.

The five instruments cover the specified rows and structural checks. The Wi-Fi parser also documents and preserves both no-colon quirks. Next I’ll test whether each instrument catches a targeted removal and run the Wi-Fi table against the base commit.

The Wi-Fi table passes all 50 assertions on the base, and the seven initial mutations all trigger test failures. I found one further issue in AC2’s instrument: it counts template literals as string literals. I’ll check whether replacing the only `"geo:"` argument with a template literal survives, despite AC2’s explicit requirement for string literals.

One instrument defect fails this review.

AC2 requires prefixes “only as string literals passed to afterPrefix,” including a set of “string-literal second arguments.” The finder also counts template literals toward that set: `isText` includes templates, and `prefixesIn` adds them without checking their literal kind ([parserSources.test.ts:36](src/__tests__/parserSources.test.ts:36), [parserSources.test.ts:67](src/__tests__/parserSources.test.ts:67)).

Replacing the sole `"geo:"` argument with `` `geo:` `` survives all four AC2 tests. That mutation and its selector are submitted ([patch:9](.review-out/mutations/AC2-template-prefix.patch:9), [results:4](.review-out/results.txt:4)).

| Criterion | Instrument | Mutation result |
|---|---|---|
| AC1 | [text.test.ts:7](src/__tests__/text.test.ts:7) | Removing matching fails |
| AC2 | [parserSources.test.ts:147](src/__tests__/parserSources.test.ts:147) | Inline prefix fails; template substitution survives |
| AC3 | [prefixOnce.test.ts:45](src/__tests__/prefixOnce.test.ts:45) | Duplicate prefix call fails |
| AC4 | [wifiTable.test.ts:45](src/__tests__/wifiTable.test.ts:45) | Skipping no-colon fields fails |
| AC5 | [parserSources.test.ts:177](src/__tests__/parserSources.test.ts:177) | Local unescaping fails |
| AC6 | [query.test.ts:7](src/__tests__/query.test.ts:7) | Removing caller-name folding fails |
| AC7 | [parserSources.test.ts:199](src/__tests__/parserSources.test.ts:199) | Restoring private export fails |

All mutation outcomes are recorded in [results.txt:2](.review-out/results.txt:2). The targeted tests pass, and the Wi-Fi table passes on the base ([results.txt:10](.review-out/results.txt:10)).

No scope violation was found; the restricted `urlSafety.ts` changes are exclusively the permitted export removals ([scope.txt:3](.review-out/scope.txt:3), [scope.txt:20](.review-out/scope.txt:20)). No additional regression finding or probe is submitted ([results.txt:12](.review-out/results.txt:12)).

VERDICT: FAIL
