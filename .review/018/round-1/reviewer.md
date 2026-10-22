I’ll read the current implementation and tests, create the required mutation artifacts, and run focused checks. I won’t read the diff or repeat the baseline suite.
The capture fakes record whether stale directories exist when capture starts, before writing their images; the tests also assert successful decode and preserved fixture files (core/tests/scan.rs:58–61, core/tests/scan.rs:152–165; core/tests/find_all.rs:93–96, core/tests/find_all.rs:315–322). The shell holds its guard across the awaited scan and sweeps at setup (src-tauri/src/scan.rs:35–43; src-tauri/src/lib.rs:45–50). I’ll now test whether removing or moving those behaviors makes the instruments fail.
All eleven mutations produced test failures rather than compile errors. They cover deleting the sweep, removing either scan’s sweep call, sweeping too late, broadening the prefix match, deleting the active directory, following an external link, panicking on missing scratch, and breaking guard exclusion or cleanup (.review-out/logs/AC1-no-sweep.log:14; the remaining logs are in the same directory). I’m finishing the focused tests on the restored code and checking that only review artifacts remain.
- **AC1 holds.** The three named instruments assert stale-directory removal, including what each capturer saw before capture (core/tests/scan.rs:136, core/tests/scan.rs:145; core/tests/find_all.rs:308). Deleting the sweep or either call, and moving it after capture, caused failures (.review-out/evidence.txt:11–14).
- **AC2 holds.** Tests check preserved file contents, exactly one decoded URL, and the external symlink target (core/tests/common/mod.rs:74; core/tests/scan.rs:156–165, core/tests/scan.rs:214; core/tests/find_all.rs:319–322). Prefix, active-directory and link-following mutations failed (.review-out/evidence.txt:15–17).
- **AC3 holds.** `sweeping_a_missing_scratch_is_not_an_error` exercises the missing path; changing the read to `unwrap()` failed (core/tests/scan.rs:242; .review-out/evidence.txt:18).
- **AC4 holds.** The three required tests verify exclusion, ordinary Drop and panic Drop, including the panic payload (core/tests/single_flight.rs:7, core/tests/single_flight.rs:26, core/tests/single_flight.rs:34). All corresponding mutations failed (.review-out/evidence.txt:19–21). Acquisition uses one atomic swap; Drop clears it (core/src/single_flight.rs:18, core/src/single_flight.rs:35).

The shell holds the guard until the outcome returns and sweeps once at startup, as required (src-tauri/src/scan.rs:35–43; src-tauri/src/lib.rs:45–50).

No scope violation found in the changed-file inventory (.review-out/evidence.txt:2–10). No additional regression identified; existing edge tests cover nested directories and links inside stale scans (core/tests/scan.rs:200, core/tests/scan.rs:228).

All 32 focused tests pass after restoration. Eleven patch/selector pairs remain under `.review-out/mutations/` (.review-out/evidence.txt:11–24).

VERDICT: PASS
