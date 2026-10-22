I fixed the one finding. The `AC2` finder (in `src/__tests__/parserSources.test.ts`) now accepts only a string literal as the prefix argument of `afterPrefix`. I did not run the full baseline, only the tests I touched.

- **Cause:** the finder counted template literals as string literals. So `afterPrefix(text, `geo:`)` passed all four AC2 tests.
- **Fix:** a template argument now fails the "no string literal outside `afterPrefix`" test instead of being counted as passed.
- **Finder check:** I added a case to the finder test for `afterPrefix(t, `WIFI:`)`. It expects one literal found and nothing passed.
- **Red first:** I put the old check back and the finder test failed. With the fix in, 10 tests pass in `parserSources.test.ts`.
- **Reviewer's mutation:** replacing `"geo:"` with a template in `src/lib/geo.ts` now fails 2 tests in that file. I undid the change afterwards.
- **Commit:** one commit, with the fix and the finder test.

I wrote the seven mutation pairs, `AC1` to `AC7`, in `.review-out/mutations/` after the commit. I applied each patch and ran its selector, and every one went red:

| Pair | Mutation | Failing tests |
|---|---|---|
| `AC1-tdd-case` | `afterPrefix` compares with case | 3 |
| `AC2-tdd-inline-tel` | the `tel:` regex returns to `payload.ts` | 3 |
| `AC3-tdd-double-wifi` | a second `WIFI:` test in `classify` | 13 |
| `AC4-tdd-skip-no-colon` | a field with no colon is skipped | 4 |
| `AC5-tdd-own-unescape` | `wifi.ts` unescapes with its own regex | 1 |
| `AC6-tdd-name-case` | `queryParam` stops lower-casing the name | 3 |
| `AC7-tdd-export` | `export` put back on `HeadlineSize` | 1 |

The tree is clean apart from `.review-out/`.
