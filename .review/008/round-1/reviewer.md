I’ll read the current configuration and test instrument, then create and run targeted mutations for each acceptance criterion. I’ll also check the changed-file list for scope violations without reading the diff.
The test covers the required permission set, CSP parser and directive values, and both single-source guards in `src/__tests__/tauriSecurity.test.ts:24–71`. I’ll now check that removing each protection makes its selector fail, including adding a nested capability file.
- **AC1 passes.** The capability grants exactly the three permissions to `main`, with only the required keys (`src-tauri/capabilities/default.json:2–10`). The instrument asserts all three requirements (`src/__tests__/tauriSecurity.test.ts:24–35`). Removing all permissions produces an assertion failure (`.review-out/AC1-remove-permissions.log:16–17`).

- **AC2 passes.** The CSP contains the seven required directives and sources (`src-tauri/tauri.conf.json:30`). The instrument uses the specified parser and checks string type, uniqueness, names and ordered sources (`src/__tests__/tauriSecurity.test.ts:12–21`, `:38–60`). Removing the hardening directives and appending a duplicate both fail assertions (`.review-out/AC2-remove-hardening.log:17–18`, `.review-out/AC2-duplicate-base.log:17–18`).

- **AC3 passes.** The instrument checks capability basenames recursively and restricts security keys to `csp` (`src/__tests__/tauriSecurity.test.ts:64–71`). Both a nested capability and an inline capability produce assertion failures (`.review-out/AC3-extra-capability.log:16–17`, `.review-out/AC3-inline-capability.log:16–17`).

No scope violation found: the changed-file inventory contains only the two permitted configuration files and the new test (`.review-out/scope.txt:1–3`). No additional regression identified; runtime enforcement remains outside this instrument’s claims (`src/__tests__/tauriSecurity.test.ts:1–3`).

Five mutation patch/selector pairs are in `.review-out/mutations/`. All mutations were reverted.

VERDICT: PASS
