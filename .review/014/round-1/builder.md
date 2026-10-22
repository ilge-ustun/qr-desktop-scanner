Story 014 is done in four commits on `story/014`. tsc, eslint and the full vitest suite (499 tests) pass on my tree. I did not run the harness's full baseline (`npm run build`, cargo, the macOS shell check); that runs when I hand over. The DOM is unchanged: 013's DOM guard and the existing card tests pass and were not touched.

## Commits
1. **`47fb072` (AC3)**: Wi-Fi has its own module, `src/lib/wifi.ts`. It holds `WifiNetwork`, `parseWifi` (moved as is) and `wifiMeta`. `payload.ts` imports the parser and re-exports the type, because the denied `WifiCard.test.tsx` imports it from there. The seven parser cases moved word for word to `wifi.test.ts`. The `classify` case stays in `payload.test.ts`, unchanged, and nothing else in that file changed.
2. **`63e74ee` (AC2)**: `Tone`, `toneOf` and `linkMeta` are in `urlSafety.ts`. `Ink.tsx` no longer defines `Tone`, and `Card.tsx` takes it from `src/lib`.
3. **`a803428` (AC1, AC4, AC5)**:
   - `src/lib/cardModel.ts` holds `fieldCardModel`.
   - `FieldCard` now takes the model and an `onOpen`, so the Open in Maps wiring is inside FieldCard.
   - ResultCard picks the card with one switch. The Wi-Fi-without-a-network and empty-`tel:` fallbacks are explicit cases. The default clause has `const unhandled: never = payload`.
   - The four wrapper cards are deleted. The dead phone branch and the `.trim()` are gone.
4. **`45ea22c`**: fixes my own tone test names; `%j` printed the warnings instead of the tone.

## Tests
- **New test files:** `cardModel.test.ts`, `tone.test.ts`, `wifi.test.ts` and `cardLogicSources.test.ts`. The source test's helpers are in `src/__tests__/sourceText.ts`; the denied `cardSources.test.ts` keeps its own copy.
- **The AC5 checker is tested too.** Small samples show it rejects `payload as never`, a default with no binding, two switches, an `if` on `.kind` and `@ts-ignore`.
- **One extra file, `cardModelDom.test.tsx`.** It renders each AC1 code and checks the card shows what its model says. It also renders hidden networks, because the story notes that no rendered test holds a hidden network's label.

## What I saw
- **Red first.** Each new test failed before its code existed. I also ran the source test against the base in a scratch worktree. Its findings match the story: the five `if`s at lines 26–38, `.trim(` once, `"phone"` twice, and `Tone` in `Ink.tsx`.
- **The tsc claim of AC5.** I added an `extra` kind to `Payload` once. tsc then failed only at the binding: `ResultCard.tsx(52,13): error TS2322 … not assignable to type 'never'`. I discarded the change. The human step in the story still stands.
- **"Goes red when" items.** I ran at least one item per criterion that is not the one in its tdd patch: emails before phones, SAE removed, `as never`, and others. Each one went red.
- **Mutation pairs.** Five pairs are in `.review-out/mutations/`, written with `git diff` after the last commit. Each selector passes at head and fails with its patch applied:

| Patch | Selector |
|---|---|
| `AC1-tdd-search-form-row` | `src/__tests__/cardModel.test.ts -t "AC1"` |
| `AC2-tdd-danger-tone` | `src/__tests__/tone.test.ts -t "AC2"` |
| `AC3-tdd-security-case` | `src/__tests__/wifi.test.ts -t "AC3"` |
| `AC4-tdd-component-tone` | `src/__tests__/cardLogicSources.test.ts -t "AC4"` |
| `AC5-tdd-never-default` | `src/__tests__/cardLogicSources.test.ts -t "AC5"` |

The tree is clean apart from `.review-out/`, which git ignores. I found no problems outside the story's scope.
