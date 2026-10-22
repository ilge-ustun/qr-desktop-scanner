Story 012 is implemented and committed. rxing no longer has the `image` feature, and the decoder reads the grey buffer directly.

The new vitest file has two tests, AC1 and AC2. Both failed on the base and pass now. The cargo checks also pass: clippy with `-D warnings`, and all of `cargo test -p qr-core`, including the decode, scan and find_all fixtures. I did not run the full baseline set (`npm run build`, `scripts/check-macos-shell.sh`, lint), as the instructions said the harness runs it. I also did not run the Mac checks from the story, or the `git diff --exit-code Cargo.lock` check.

- **Manifest:** `core/Cargo.toml` drops `"image"` from rxing's features.
- **Decoder:** `core/src/decode.rs` now calls `detect_multiple_in_luma_with_hints` with the raw grey bytes. Only the first pass copies the grey image. The darkened and enlarged images are moved in. The hints, the pass order, the 600-pixel rule, the de-duplication and the `Decoder` trait are unchanged.
- **Lock:** Cargo regenerated `Cargo.lock` offline with `cargo metadata --offline`. Cargo removed 631 lines.
- **Test:** `src/__tests__/coreDependencies.test.ts` reads `core/Cargo.toml` and `Cargo.lock` with `?raw` and the line rules from the story.

Mutation checks:
- **AC1:** `AC1-tdd-rxing-image.patch` puts `"image"` back in rxing's features, and the selector is `-t "AC1"`. I did not run this patch myself. The second item, removing `default-features = false` from the rxing line, I ran by hand and the AC1 test went red.
- **AC2:** `AC2-tdd-lock.patch` restores the old `Cargo.lock`, and the selector is `-t "AC2"`. I ran it by hand and AC2 went red.
- **Tree:** The patches are in `.review-out/mutations/`, each with its `.test` file. The tree is clean apart from `.review-out/`, and I did not run the classifier.
