I’ll read the current files, check the AC tests, and write mutations for the harness. I’ll use the supplied baseline results without rerunning the full suite.
The six window tests pass. AC1 checks all eleven specified inputs; AC2 checks all 59 preserved bits and both mixed inputs. The shell applies the rule before the first show, and the file identities and lockfile contents are consistent with the permitted scope. I’ll now test mutations that remove each AC’s behavior.
- **AC1 passes.** Instrument: `cargo:qr-core/window::sets_all_spaces_and_full_screen_auxiliary_and_clears_the_rest_of_its_bits`. It checks all eleven specified rows with literal expected values ([core/tests/window.rs:26](core/tests/window.rs#L26)). Removing the rule makes it fail an assertion, rather than compilation ([mutation log:12](.review-out/evidence/AC1-remove-rule.log#L12)).

- **AC2 passes.** Instrument: `cargo:qr-core/window::every_other_bit_comes_out_as_it_went_in`. It checks the 59 unrelated bits, `u64::MAX`, and `0x1286` using the specified expectations ([core/tests/window.rs:49](core/tests/window.rs#L49)). Discarding unrelated bits makes it fail on input `0x4` ([mutation log:12](.review-out/evidence/AC2-discard-unrelated-bits.log#L12)).

- **Shell requirements hold.** The adapter handles `ns_window()` errors, documents its unsafe conversion, and reads, transforms, then writes the collection behavior ([macos.rs:100](src-tauri/src/platform/macos.rs#L100)). The stub matches ([unsupported.rs:38](src-tauri/src/platform/unsupported.rs#L38)); setup calls it before the first show ([lib.rs:61](src-tauri/src/lib.rs#L61)). The dependency is macOS-only ([Cargo.toml:26](src-tauri/Cargo.toml#L26)), and only the permitted lockfile dependency list changed ([scope evidence:10](.review-out/evidence/scope.txt#L10)).

- **No scope violation identified.** Changed file identities are confined to the permitted files ([scope evidence:1](.review-out/evidence/scope.txt#L1)). The arithmetic preserves unrelated bits and has no mutable state; I found no additional regression case warranting a probe ([window.rs:21](core/src/window.rs#L21)). Actual full-screen visibility remains subject to the story’s “Only a person on a Mac” verification.

Both mutation patches and selectors are in `.review-out/mutations/`; tracked files are restored ([scope evidence:13](.review-out/evidence/scope.txt#L13)).

VERDICT: PASS
