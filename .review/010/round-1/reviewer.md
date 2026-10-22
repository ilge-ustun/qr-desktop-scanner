I’ll read the current implementation and tests, check the scope against the base’s file list, and write a mutation for each acceptance criterion for the harness to run.
The targeted file passes all 108 tests. The named instruments cover every specified table, including the parser preconditions and exact warning assertions. I’ll now check that removing the new behaviors—and broadening the checks that should exclude safe inputs—makes those instruments fail.
All six criteria pass. The targeted suite passes 108 tests, and all seven mutations produce real test failures ([evidence](.review-out/evidence.txt:1)).

| Criterion | Instrument and assertions | Mutation result |
|---|---|---|
| AC1 | `010 AC1:` checks all 50 country combinations and three trailing-dot cases, including exact results and the parser precondition ([tests](src/__tests__/urlSafety.test.ts:122)). | Removing the country rule or dot normalization fails ([evidence](.review-out/evidence.txt:6)). |
| AC2 | `010 AC2:` checks exact results for all four exclusions ([tests](src/__tests__/urlSafety.test.ts:142)). | Removing the second-label guard fails ([evidence](.review-out/evidence.txt:8)). |
| AC3 | `010 AC3:` checks all nine mailtos, recipient text, exactly one caution, and retained Open ([tests](src/__tests__/urlSafety.test.ts:151)). | Deleting recipient-warning behavior fails all nine cases ([evidence](.review-out/evidence.txt:9)). |
| AC4 | `010 AC4:` checks exact warning-free results for all five mailtos ([tests](src/__tests__/urlSafety.test.ts:184)). | Removing recipient-field filtering fails ([evidence](.review-out/evidence.txt:10)). |
| AC5 | `010 AC5:` checks all 21 destinations, parser preconditions, exact local caution, Open, and retained IP warnings ([tests](src/__tests__/urlSafety.test.ts:209)). | Deleting local-warning behavior fails all 21 destinations ([evidence](.review-out/evidence.txt:11)). |
| AC6 | `010 AC6:` checks all 17 exclusions and retained IP warnings ([tests](src/__tests__/urlSafety.test.ts:255)). | Removing local-address exclusions fails all 17 destinations ([evidence](.review-out/evidence.txt:12)). |

The patches and selectors are in `.review-out/mutations/`. No instrument is absent; outright deletion is caught for the new recipient and local warnings ([evidence](.review-out/evidence.txt:9), [evidence](.review-out/evidence.txt:11)).

No scope violation was found: only the two explicitly permitted files changed, and the existing tests remain unchanged ([inventory and comparison](.review-out/evidence.txt:2)).

No additional regression was identified in recipient parsing or local-range boundaries: parsing splits fields before decoding, preserves `+`, tolerates malformed escapes, and checks parsed IP ranges with bounded comparisons ([recipient logic](src/lib/urlSafety.ts:99), [local logic](src/lib/urlSafety.ts:71)). No probe was warranted.

VERDICT: PASS
