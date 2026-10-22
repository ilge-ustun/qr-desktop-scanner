I’ll read the implementation and test instruments, then create a mutation for each acceptance criterion and run its targeted selector. I’ll also check the Rust flow and scope restrictions, leaving only `.review-out/` artifacts.
The tests assert the specified button order, command strings, card order and scope-dependent notices (`src/__tests__/App.test.tsx:64`, `src/__tests__/App.test.tsx:92`, `src/__tests__/ipc.test.ts:29`, `src/__tests__/App.test.tsx:153`). Both Rust entry points use the same scan lock (`src-tauri/src/scan.rs:23`, `src-tauri/src/scan.rs:28`, `src-tauri/src/scan.rs:32`). I’ll now remove individual behaviors to verify that the test instruments fail.
All 11 mutations caused test failures, including deleting the find-all button, routing scans incorrectly, dropping the scope and rendering only one card (`.review-out/mutation-results.json:1`). The 22 targeted tests passed before mutation (`.review-out/targeted-tests.txt:1`). No denied path changed, and the original drag-scan tests are byte-identical to the base (`.review-out/scope.txt:19`).
All five acceptance criteria hold. Their instruments assert the required behavior:

| Criterion | Instrument and evidence |
|---|---|
| AC1 | Button identity, sibling order, secondary classes and exclusive find-all routing: `src/__tests__/App.test.tsx:64`. |
| AC2 | Exclusive drag routing and both buttons disabled during either scan: `src/__tests__/App.test.tsx:57`, `src/__tests__/App.test.tsx:75`. |
| AC3 | Exact invocation lists enforce command names, call counts and no arguments: `src/__tests__/ipc.test.ts:29`, `src/__tests__/ipc.test.ts:34`. |
| AC4 | Exactly three cards with content in outcome order: `src/__tests__/App.test.tsx:92`. |
| AC5 | Screen wording, unchanged area wording and scope event forwarding: `src/__tests__/App.test.tsx:153`, `src/__tests__/App.test.tsx:163`, `src/__tests__/ipc.test.ts:39`. |

The 22 targeted tests passed (`.review-out/targeted-tests.txt:2`). Eleven mutation pairs are ready for the harness; every mutation produced assertion failures locally, including outright button deletion (`.review-out/mutation-results.json:3`), incorrect routing (`.review-out/mutation-results.json:21`), truncating cards (`.review-out/mutation-results.json:45`) and dropping scope (`.review-out/mutation-results.json:51`).

The required Rust behavior is present: temporary capture storage, ordered decoding, text deduplication and error handling (`core/src/scan.rs:95`). Fake-based tests cover permission refusal, multiple displays, deduplication, empty results, capture errors, missing/unreadable files and cleanup (`core/tests/find_all.rs:143`, `core/tests/find_all.rs:152`, `core/tests/find_all.rs:180`, `core/tests/find_all.rs:216`, `core/tests/find_all.rs:223`, `core/tests/find_all.rs:235`, `core/tests/find_all.rs:262`).

The shell shares the scan lock, checks permission before hiding, emits scope, waits and captures off-thread (`src-tauri/src/scan.rs:32`, `src-tauri/src/scan.rs:56`). Command registration and tray routing match (`src-tauri/src/commands.rs:20`, `src-tauri/src/lib.rs:33`, `src-tauri/src/tray.rs:42`). macOS capture uses CoreGraphics and direct command arguments; runtime behavior still requires the specified Mac verification (`src-tauri/src/platform/macos.rs:71`, `src-tauri/src/platform/macos.rs:91`).

No scope violations were found (`.review-out/scope.txt:19`). Regression checks retain drag-based “Scan again,” the drag shortcut and cancellation restoration (`src/App.tsx:63`, `src/App.tsx:76`, `src-tauri/src/lib.rs:19`, `src/__tests__/scanState.test.ts:22`). The original Rust scan tests remain byte-identical (`.review-out/scope.txt:20`).

VERDICT: PASS
