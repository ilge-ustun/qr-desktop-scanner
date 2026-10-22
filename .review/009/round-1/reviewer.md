I’ll read the current workflows and test independently, then create mutations for each acceptance criterion and run their targeted selectors.
The current configuration matches all four criteria, and `ciConfig.test.ts` has a test group for each. I’ll now test whether those groups catch deleted permissions, checkout protection and Dependabot entries, plus restored release caching, an extra release job and an unpinned action.
All four acceptance criteria hold.

- **AC1:** macOS CI grants only top-level `contents: read` (.github/workflows/macos.yml:14–15). The instrument checks the block and excludes write permissions (src/__tests__/ciConfig.test.ts:107–116).
- **AC2:** release checkout disables credential persistence, and the release retains no Rust cache step (.github/workflows/release.yml:21–48). The instrument checks every checkout and rejects both prohibited cache actions (src/__tests__/ciConfig.test.ts:119–144).
- **AC3:** release retains its three permissions and single job; the instrument checks those and every action’s SHA pin ( .github/workflows/release.yml:12–18; src/__tests__/ciConfig.test.ts:147–173).
- **AC4:** Dependabot retains the actions entry and adds the required npm and cargo configurations (.github/dependabot.yml:5–34). The instrument checks ecosystem count, preserved actions configuration, schedules, branches and grouping (src/__tests__/ciConfig.test.ts:176–238).

Nine mutations, with paired `.patch` and `.test` files, are saved under `.review-out/mutations/`. Every selector produced a real test failure, including outright deletions of the behavior under test ([mutation-results.txt](.review-out/mutation-results.txt:1)).

Only the three permitted configuration files and the new test changed ([changed-files.txt](.review-out/changed-files.txt:1)). No additional regression was found in the retained build and publishing steps (.github/workflows/release.yml:44–68). Actual GitHub execution remains outside this text instrument’s proof (src/__tests__/ciConfig.test.ts:1–4).

VERDICT: PASS
