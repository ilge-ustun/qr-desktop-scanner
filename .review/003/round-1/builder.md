The decoy-domain check is in `assess()` in `src/lib/urlSafety.ts`, and `https://paypal.com.secure-login.example.net/` now gets one danger warning and the headline `example.net`.

I ran only the two test files I changed (23 tests, all green) plus `tsc` and eslint on the changed files. I did not run the full baseline; the harness does that on handover.

- **Tests:** I added the AC1–AC3 tests to `src/__tests__/urlSafety.test.ts`, and the headline check (AC2b) to `src/__tests__/ResultCard.test.tsx`. I saw them fail first, then pass after the change.
- **Implementation:**
  - The two-part suffix list is a constant next to `SHORTENERS`. It holds the four required suffixes plus a few more, such as `com.mx`, `co.nz` and `org.uk`.
  - The decoy labels are `com`, `net`, `org`, `io`, `co`, `gov` and `edu`. A match has to come after another label.
  - The warning fires once. It names the hostname's labels up to the first match, and the registrable domain: `This address starts with "paypal.com" but belongs to example.net.`
  - `domain` becomes the registrable domain only when the warning fires, and `openable` stays true.
- **Mutation check:** Dropping the "must come after another label" rule left the AC3 test green at first. A second `> 0` guard did the same job, so I removed it. The mutation now goes red. I also checked two more items from the "Goes red when" lists: removing `edu` fails the AC1 test, and leaving `domain` as the full host fails the AC2 headline test.
- **Commits:** two, the feature and the guard cleanup. The `.review-out/mutations/` patches are written last, from the final commit, and the tree is clean apart from `.review-out/`. The patches are:
  - `AC1-tdd-severity` (danger changed to caution)
  - `AC2-tdd-two-labels` (always the last two labels)
  - `AC3-tdd-country-code` (`us` added to the label list)

I touched nothing outside the scope. The Mac checks in the story's human-verification section remain for a person to do.
