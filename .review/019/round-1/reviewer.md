I’ll read the current implementation and tests, check the changed-file scope without reading the diff, and leave mutation patches for all five acceptance criteria.
All 11 tests in `pipeline.rs` pass. Their assertions cover the specified outcomes, call counts, messages and cleanup. The shell also calls core after the hide delay and keeps permission request → result event → popover order (`src-tauri/src/scan.rs:43–48,70–79`). I’ve written one mutation per AC and will now check that each selected test fails.
All five ACs hold. Each required instrument asserts the specified behavior:

| AC | Instrument in `core/tests/pipeline.rs` | Evidence |
|---|---|---|
| AC1 | `run_scan_creates_a_missing_scratch`, `run_find_all_creates_a_missing_scratch` | Nested scratch creation, decoded text and empty scratch afterward: `core/tests/pipeline.rs:207–233`. |
| AC2 | `run_area_uses_the_area_capturer_only`, `run_screen_uses_the_displays_capturer_only` | Refused/granted permissions, exact text and both capturer counts: `core/tests/pipeline.rs:143–181`. |
| AC3 | `the_outcome_says_what_the_shell_does_next` | Both methods checked across all five outcomes: `core/tests/pipeline.rs:185–203`. |
| AC4 | `scan_errors_keep_todays_messages`, `the_flows_report_todays_messages` | All five error strings, conversion, flow errors and cleanup: `core/tests/pipeline.rs:253–335`. |
| AC5 | `run_scan_reports_a_repeated_code_once` | Exact ordered result retains the first format: `core/tests/pipeline.rs:339–357`. |

Five mutation patch/selector pairs are left in `.review-out/mutations/`. Each compiled and produced an assertion failure: `.review-out/mutations/AC1-no-scratch-creation.log:9`, `AC2-area-runs-screen.log:9`, `AC3-no-permission-request.log:9`, `AC4-empty-error-message.log:9`, `AC5-no-deduplication.log:9`.

The structural requirements also hold: both flows use one decoder step, errors propagate through typed results, and scratch creation distinguishes Scratch from TempDir (`core/src/scan.rs:131–158,199–240`). The shell preserves its early permission check, error wording, delay and result-handling order (`src-tauri/src/scan.rs:35–83`).

No out-of-scope files changed; the file inventory contains only the four permitted paths (`.review-out/changed-files.txt:1–4`). No regression found in cancellation, refused permission or empty-display handling; explicit tests cover these edges (`core/tests/pipeline.rs:237–248,379–405`). macOS runtime verification remains outside this review.

VERDICT: PASS
