I’ll read the current implementation and acceptance tests, then create a targeted mutation for each criterion. I’ll leave only review artifacts under `.review-out/`.

The new tests assert the specified model values and source rules directly ([cardModel.test.ts:18](src/__tests__/cardModel.test.ts:18), [cardLogicSources.test.ts:53](src/__tests__/cardLogicSources.test.ts:53)). I’ll now remove representative behavior to check that those assertions fail.

All seven mutations produced assertion failures, and the unmodified targeted tests passed: 136 tests across nine files ([mutation logs](.review-out/AC5-no-never.log:10), [targeted.log:5](.review-out/targeted.log:5)). Exact text checks also confirmed that the Wi-Fi parser moved unchanged and that `payload.test.ts` lost only the permitted import and seven cases ([scope.txt:2](.review-out/scope.txt:2)).

All acceptance criteria hold. The targeted run passed 136 tests ([targeted.log:5](.review-out/targeted.log:5)).

| Criterion | Instrument and mutation evidence |
|---|---|
| AC1 | Exact model assertions cover all specified rows ([cardModel.test.ts:18](src/__tests__/cardModel.test.ts:18)). Removing contact phone rows fails C1 ([log:10](.review-out/AC1-no-contact-rows.log:10)). |
| AC2 | Literal warning and label cases cover T1–T6 and M1–M5 ([tone.test.ts:9](src/__tests__/tone.test.ts:9)). Removing danger handling or warning labels fails assertions ([danger log:12](.review-out/AC2-no-danger.log:12), [label log:12](.review-out/AC2-no-warning-label.log:12)). |
| AC3 | Parser, label and module-location instruments are present ([wifi.test.ts:5](src/__tests__/wifi.test.ts:5), [cardLogicSources.test.ts:53](src/__tests__/cardLogicSources.test.ts:53)). Removing quote stripping or hidden labels fails ([parser log:10](.review-out/AC3-no-unquote.log:10), [label log:11](.review-out/AC3-no-hidden.log:11)). |
| AC4 | Source checks cover moved rules, wrappers, imports, Tone and comment invariance ([cardLogicSources.test.ts:139](src/__tests__/cardLogicSources.test.ts:139)). Deleting the model import fails ([log:10](.review-out/AC4-no-model-import.log:10)). |
| AC5 | Compiler-API checks enforce the exhaustive switch and prohibited forms ([cardLogicSources.test.ts:228](src/__tests__/cardLogicSources.test.ts:228)). Removing `never` fails ([log:10](.review-out/AC5-no-never.log:10)); adding an extra payload kind also produces the expected tsc error ([extra-kind.log:1](.review-out/extra-kind.log:1)). |

No scope violation was found through tree-object comparison and exact extraction checks ([scope.txt:1](.review-out/scope.txt:1)). The DOM guard passed within the targeted run ([cardDom.test.tsx:348](src/__tests__/cardDom.test.tsx:348), [targeted.log:5](.review-out/targeted.log:5)). Mac visual verification remains a human check.

Seven patch/selector pairs are saved under `.review-out/mutations/`; all investigation edits were restored.

VERDICT: PASS
