I’ll read the current implementation and App tests, then create a mutation for each acceptance criterion and check that its selector fails. I won’t read the diff or rerun the baseline checks.
The App tests cover all specified rows, including exact IPC calls, Copy feedback, warned-link focus, and native Enter handling on buttons. I’m now checking that those assertions fail when the corresponding behavior is removed.
All four mutations produced assertion failures: deleting action execution failed 17 AC1 cases; ignoring focus failed 3 AC2 cases; deleting the button exemption failed all 4 AC3 cases; removing repeat suppression failed 3 AC4 cases. The unmodified targeted tests passed all 84 cases. The patches and selectors are saved in `.review-out/mutations/`.
No blocking findings.

| Criterion | Instrument and assertions | Mutation result |
|---|---|---|
| AC1 | All 36 card/key combinations; exact calls, Copy feedback, warned-link focus, and Connect once: [AppKeys.test.tsx:121](src/__tests__/AppKeys.test.tsx:121). | Deleting action execution fails 17 cases. |
| AC2 | All eight focus/order rows; exact calls and resulting focus: [AppKeys.test.tsx:184](src/__tests__/AppKeys.test.tsx:184). | Ignoring focus fails 3 cases. |
| AC3 | All four focused buttons; uncancelled Enter, no calls, and field-copy click: [AppKeys.test.tsx:266](src/__tests__/AppKeys.test.tsx:266). | Deleting the button exemption fails all 4 cases. |
| AC4 | Other keys, repeats, absent cards, recording, and Escape: [AppKeys.test.tsx:290](src/__tests__/AppKeys.test.tsx:290). | Removing repeat suppression fails 3 cases. |

The unmodified targeted run passed 84 tests. Mutation runs produced assertion failures; patches and selectors are in [mutations](.review-out/mutations/). Results: [baseline](.review-out/targeted.json:1), [AC1](.review-out/AC1-delete-action.json:1), [AC2](.review-out/AC2-ignore-focus.json:1), [AC3](.review-out/AC3-delete-button-exemption.json:1), [AC4](.review-out/AC4-delete-repeat-guard.json:1).

No out-of-scope files were touched: [file inventory](.review-out/scope.txt:1). Regression checks cover pending joins, dismissal, replacement results, unmounting, cancellation, and repeated warned-link shortcuts: [AppKeys.test.tsx:357](src/__tests__/AppKeys.test.tsx:357).

Hints remain outside buttons and use mono glyphs: [Ink.tsx:52](src/components/Ink.tsx:52), [styles.css:158](src/styles.css:158). Actual macOS keyboard delivery and visual appearance remain human verification items, as specified.

VERDICT: PASS
