I’ll read the current files, check the dependency tests against each criterion, and write mutation patches for the harness without reading the implementation diff.
The current test asserts both criteria, including the lockfile sanity checks. Cargo’s offline resolution also left `Cargo.lock` unchanged. I’ll now check that the selectors fail when rxing’s `image` feature or forbidden lock entries return.
- **AC1 holds.** The manifest specifies the required features and disables defaults (`core/Cargo.toml:9–10`). Its instrument checks dependency uniqueness, feature lists and disabled defaults (`src/__tests__/coreDependencies.test.ts:10–30`, `:48–56`). Restoring rxing’s `image` feature causes an assertion failure (`.review-out/AC1-rxing-image.log:10–24`).

- **AC2 holds.** Its instrument parses package blocks and version-qualified dependencies, checks sanity conditions, and rejects the forbidden packages and rxing dependencies (`src/__tests__/coreDependencies.test.ts:35–44`, `:59–73`). Mutations adding `ravif` and restoring rxing’s `image` dependency both fail assertions (`.review-out/AC2-ravif.log:10–15`; `.review-out/AC2-rxing-image.log:10–15`).

- **Scope is respected.** Only the four permitted files changed (`.review-out/scope.txt:1–4`). Mutation patches and selectors are under `.review-out/mutations/`.

- **No additional regression found.** The decoder retains the `&DynamicImage` trait, ordered passes, 600-pixel threshold, hints and first-occurrence deduplication (`core/src/decode.rs:19`, `:30–56`, `:75–94`). The replacement consumes the grey buffer through the luma helper (`core/src/decode.rs:81–84`). Real macOS capture behavior remains outside this review’s verification.

VERDICT: PASS
