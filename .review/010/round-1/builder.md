Story 010 is implemented in three commits on `story/010`, one per task. The tests for each AC were seen failing before the code went in. All 108 tests in `src/__tests__/urlSafety.test.ts` pass, and the four card, keys, app and docs specs that reach `assess` pass too (145 tests).

| Commit | What changes | ACs |
|---|---|---|
| `7d6d2b7` | The decoy warning names the right owner: one trailing dot is dropped from every host, and a two-letter last label after one of the ten labels joins the suffix. The existing list stays. | AC1, AC2 |
| `c7befa3` | A mailto whose query has `to`, `cc` or `bcc` gets one `extra-recipients` caution naming each address, percent-decoded. Open is still offered. | AC3, AC4 |
| `7e490fd` | `localhost`, `*.localhost`, `*.local`, 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, `[::1]`, fc00::/7 and fe80::/10 get one `local-address` caution. IP addresses keep `ip-address` as well. | AC5, AC6 |

Only `src/lib/urlSafety.ts` and its test file changed.

**Red before green.** AC1, AC3 and AC5 failed the way the story predicts: `co.kr`, `com.`, "belongs to com..", no mailto warning, no local warning. The parser checks passed first: the trailing dot reaches `assess`, and `2130706433` and `[0:0:0:0:0:0:0:1]` become `127.0.0.1` and `[::1]`. AC2, AC4 and AC6 check that cases outside the new rules stay as they are, so they already passed on the base. Their patches show they can fail.

**Patches.** There is one pair per AC in `.review-out/mutations/`, made with `git diff` after the last commit. Each applies to HEAD, fails under its `-t "010 ACn:"` selector, and passes without the patch. I also tried 21 other changes from the story's "Goes red when" lists, at least one per AC and none the same as a patch. Every one failed, and none was committed.

**Choices the story left open:**
- **Open still offered on `https://./`.** `openable` is now based on the parsed hostname. Otherwise that host, a bare dot, would lose Open even though `url_guard` would still open it.
- **Recipient list.** Addresses are split on commas and listed with ", ". An empty `to`, `cc` or `bcc` adds no one and gets no warning. A `+` in an address is kept. An encoded field name such as `%62cc` is decoded too, so it is caught.
- **Extra tests.** These also cover `mailto:?to=…`, the empty fields, `+`, `%62cc`, `127.1`, `0x7f.0.0.1`, `10.0.0.1.`, upper case, and a user name before a local IP. Each new mailto edge test was made to fail once.

**What I ran:** `tsc --noEmit` and eslint on the two changed files. I left the full baseline set to the harness, and nothing in Rust changed.

**A slip, now fixed:** one of my mutation checks reset the file before the mailto code was committed, which wiped that code. I re-applied it, committed it, and ran those two checks again on the commit.

**Open question, not fixed:** the warning reads only the query, which ends at a `#`. The whole URL, including anything after the `#`, is still passed to the system to open. I don't know whether Mail reads header fields after a `#`, as in `mailto:a@b.com?subject=x#&bcc=y@z.com`. If it does, an address there gets no warning. That needs checking on a Mac.

The story's human-verification checklist still needs someone on a Mac.
