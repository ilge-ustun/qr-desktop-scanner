Story 015 is done in one commit. `.github/workflows/macos.yml` now has `paths-ignore` on `push`, so a push that changes only `.stories/`, `.review/` or `.blocked/` no longer starts a macOS build. I did not run the full baseline or the mutation classifier; the harness does both.

- **Workflow:** under `on.push`, `branches: [main, develop]` stays on its one line, followed by a block `paths-ignore` list of `.stories/**`, `.review/**` and `.blocked/**`. `pull_request` and `workflow_dispatch` are unchanged, so both still always build. The new top comment states the exception, why, and that pull requests and manual runs build. I kept the lines about SHA pins and Dependabot, and the permissions comment. The diff touches only the top comment and the `on` block.
- **Tests:** I added `015 AC1` and `015 AC2` describes to `src/__tests__/ciConfig.test.ts`, reusing its line reader.
- **Red before green:** before the workflow change, the two `015 AC1` tests failed and the `015 AC2` tests passed, as the story says they would. After it, all 17 tests in that file pass.
- **Spot checks:** I tried two items from the "Goes red when" lists, then undid each:
  - `.review/**` → `.review/*` failed one test.
  - `branches: [main]` failed one test.
- **Mutation pairs:** `.review-out/mutations/` holds `AC1-tdd-blocked-removed` (removes the `.blocked/**` item) and `AC2-tdd-branches` (narrows branches to `[main]`), each with its `.patch` and `.test`. I wrote them after my final commit, and the tree is otherwise clean.

I did not check GitHub's real behaviour, which the story lists as unobserved. Its human verification steps cover that after `epic/quality` lands on `develop`.
