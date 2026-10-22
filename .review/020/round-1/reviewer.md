I’ll read the current implementation and targeted tests, then write one mutation per acceptance criterion for the harness. I’ll also check scope and shortcut rollback without rerunning the baseline suite.
Each AC has exact-value assertions for every specified row in the Wi-Fi and capture unit tests. The shell calls all six helpers, and shortcut changes update `current` only after saving; a failed save unregisters the candidate and resumes the previous shortcut. I’ll now check that each test detects a removed behavior and leave the patches for the harness.
All six ACs hold. Each instrument asserts the complete expected values for every specified row.

| AC | Instrument in `cargo:qr-core/lib::` | Evidence |
|---|---|---|
| AC1 | `wifi::tests::join_args_keeps_the_ssid_whole_and_the_password_last` | `core/src/wifi.rs:147–171` |
| AC2 | `wifi::tests::join_result_reads_the_output_before_the_status` | `core/src/wifi.rs:183–222` |
| AC3 | `capture::tests::selection_verdict_looks_at_the_file_first` | `core/src/capture.rs:65–97` |
| AC4 | `capture::tests::display_count_needs_a_display_and_no_error` | `core/src/capture.rs:101–112` |
| AC5 | `capture::tests::display_files_are_numbered_from_one_in_the_directory` | `core/src/capture.rs:116–127` |
| AC6 | `capture::tests::open_settings_result_names_why_open_failed` | `core/src/capture.rs:131–159` |

Six patches and selectors are in `.review-out/mutations/`. Each compiled and produced an assertion failure when its behavior was removed: `.review-out/mutations/AC1-empty-password.log:12`, `AC2-ignore-output.log:12`, `AC3-ignore-file.log:12`, `AC4-allow-zero.log:12`, `AC5-zero-based.log:12`, and `AC6-ignore-failure.log:12`.

The shell satisfies “macos.rs calls the six functions”: settings, selection, display paths/count, and Wi-Fi delegate at `src-tauri/src/platform/macos.rs:43`, `:62`, `:71`, `:91`, `:107`, and `:110`. Its public signatures still match the stub (`src-tauri/src/platform/unsupported.rs:7–38`).

The shared error preserves source text and serializes as a string (`src-tauri/src/error.rs:7–46`). Commands use it with `?` (`src-tauri/src/commands.rs:33–55`, `:90`). Failed saves unregister the candidate, resume the previous shortcut, and return `Not saved: …`; current state changes only after successful saving (`src-tauri/src/hotkey.rs:131–142`; `src-tauri/src/error.rs:24`).

No scope violation appears in the changed-file inventory (`.review-out/changed-files.txt:1–10`). No additional reproducible regression was established. Shortcut rollback remains a source-level review, with macOS runtime verification still required as the story specifies (`src-tauri/src/hotkey.rs:137–141`).

VERDICT: PASS
