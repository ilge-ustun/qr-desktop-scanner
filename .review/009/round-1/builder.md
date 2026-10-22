Stories 009's three CI changes and the new test are committed, and `src/__tests__/ciConfig.test.ts` passes all 13 tests. I haven't run the full baseline, which the harness runs when you hand over.

- **`macos.yml`:** it now has a top-level `permissions: contents: read`.
- **`release.yml`:** the checkout sets `persist-credentials: false`. I removed the `Swatinem/rust-cache` step. The three permissions and the one job are unchanged.
- **`dependabot.yml`:** I added weekly npm and cargo entries for `/`. Both target `develop` and group minor and patch updates under `patterns: ["*"]`. The github-actions entry is untouched. I reworded the top comment to cover all three ecosystems.
- **Test:** `ciConfig.test.ts` has one `describe` per criterion, AC1 to AC4. It reads the three YAML files with `?raw`. Before the edits, 6 tests failed and the 7 AC3 guard tests passed, as the story says. `tsc --noEmit` and eslint are clean on it.
- **Reds checked:** I tried one item from each criterion's list, plus extra ones for AC1 and AC4, and each turned the suite red. The changes were:
  - `persist-credentials` set to `true`
  - `contents: read` changed to `write`
  - npm's `target-branch` changed to `main`
  - `actions/checkout@v4` instead of the SHA in `macos.yml`
  - npm's `patterns` changed to `"@tauri-apps/*"`
  - `major` added to the `update-types`

  I undid each change afterwards.
- **Mutation pairs:** the four patch and `.test` pairs are in `.review-out/mutations/`, made after the commit. The `.test` selectors are `ciConfig.test.ts -t "ACn"`. I did not run the classifier. The pairs are:
  - AC1: `contents: write` in `macos.yml`
  - AC2: `persist-credentials: true`
  - AC3: `id-token: read`
  - AC4: npm `target-branch` changed to `main`

The flow-style check applies only to `dependabot.yml` and to the blocks the test inspects, because `macos.yml` already uses `branches: [main, develop]` elsewhere.

I found nothing unrelated to the story.
