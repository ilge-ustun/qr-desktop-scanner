The popover's capability now grants only `core:event:allow-listen`, `core:event:allow-unlisten` and `clipboard-manager:allow-write-text`, and its CSP now names `base-uri 'none'`, `form-action 'none'` and `object-src 'none'`.

- **Tests:** the new `src/__tests__/tauriSecurity.test.ts` covers AC1–AC3. I ran it before the change and it failed on AC1 and AC2; AC3 passed, as the story says it should. After the change, all six tests pass.
- **Not run:** I did not run the baseline (build, clippy, `scripts/check-macos-shell.sh`). I ran `npm run lint`, which showed no errors.
- **Not checked on a Mac:** nothing here shows the app still works at run time.
- **Extra reds:** adding `core:image:allow-from-path` to the capability and changing `form-action 'none'` to `form-action 'self'` each turned the test red. I undid both.
- **Mutation pairs:** three pairs are in `.review-out/mutations/`, written after the commit. Each patch takes one criterion's selector red:
  - AC1: adds `core:default` back to the capability.
  - AC2: drops `base-uri 'none'`.
  - AC3: adds `devCsp` to `app.security`.

  I did not run the classifier. I checked the AC3 patch's contents but did not run its selector.
- **Prettier:** it flags the new test file. It isn't in the baseline commands, so I left it.

Changes are in `src-tauri/capabilities/default.json`, `src-tauri/tauri.conf.json` and the new test file, in one commit. I didn't change the capability's `description`; it already describes only what the three permissions allow.
