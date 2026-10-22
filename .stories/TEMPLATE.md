---
status: ready
round: 0
base: <the epic branch this story is cut from, e.g. epic/search — omit for the default>
scope_deny: <space-separated globs the builder must not touch, or delete this line>
model: <sonnet | opus | fable — an alias, never a pinned id; omit for the default (sonnet)>
---

# Story NNN: <one line, the symptom or the goal>

<!--
Conventions, learned the expensive way. Delete this comment when writing.

- model names the builder model for this story. Omit it and the launcher's
  default is used. A one-line CSS fix and a service-worker rewrite do not need
  the same model, and until 18 Sep they got it. `merged:` also appears in
  frontmatter, written by `fleet merge` — never by hand: it is the sha
  `fleet revert` undoes.

- base names the epic branch the story belongs to, e.g. epic/result-cards
  or epic/find-all. The launcher cuts story/<id> from
  it and computes scope and evidence against it. Omit the line and the story
  goes on the launcher's default base (the integration branch). The fleet's
  own state — .stories, .review, .fleet — lives only on the integration
  branch; epic branches carry product code. The harness is not in this repo.
  A base is either the integration branch or epic/<name> (made by the
  fleet's `fleet new-epic`); lint-story rejects anything else. Landing: the
  queue merges a PASS story into its epic; the epic, or a story based on
  the integration branch, lands only when a human says so — `fleet merge`
  --epic / --land, or /merge from the phone. `fleet status` shows this as
  awaiting merge, on epic, or landed.

- scope_deny is deny-only and machine-checked. There is no allow list: the
  builder may touch any file not named here, including files nobody
  anticipated — the story says WHAT, not HOW. Globs are bash patterns
  (`src/app/collections/*` matches nested paths). A change to a denied file
  vetoes the verdict; the builder's correct move when it needs one is
  .blocked/. `.blocked/<id>.md` is always allowed; `.fleet/*` is always
  denied, whatever this line says. No line means nothing is forbidden. Put
  the same paths in prose under "Out of scope" with the reason.

- A story says WHAT to build. It never says how to stop. RULES owns that:
  the builder writes .blocked/<id>.md. A story that invents its own stop
  instruction competes with RULES, the builder follows the more specific one,
  and the launcher never learns the story halted. (006)

- State the symptom from the CURRENT file, not from a diff or a branch. A hunk
  is an excerpt; a branch may be cut from an older base. (006, and twice by
  hand)

- Every AC names its instrument and how that instrument goes red.

- ACs are headed `**ACn — <claim>.**` at column 0, exactly as below. The
  launcher extracts the ids from that heading: a story with none goes to
  needs_human before any agent runs, and the reviewer must hand the harness
  a mutation per id, which the harness runs itself. A table of ACs (005) is
  invisible to it.

- Do not write an AC of the form "suite / build / lint stays green". The
  harness runs those unconditionally as the baseline before the reviewer is
  asked anything; a red baseline vetoes on its own. An AC names a behaviour.

- Pair any AC that can be satisfied the wrong way.

- State the instrument's weakness in the story rather than letting the reviewer
  find it. (004 had no such section; 002 and 003 did.)

- Human verification is a checklist here, not an afterthought.
-->

## Symptom

<what is observably wrong, verified against the current code>

## Evidence

<measurements, probes, logs — with where they came from. Mark anything
unverified as unverified.>

## Acceptance criteria

**AC1 — <claim>.**
<the instrument> Goes red when <mutation>.

**AC2 — paired with AC1.**
<forbids satisfying AC1 the wrong way>

## Known weakness of the instrument

<what these criteria do NOT prove. If the answer is "nothing", say why.>

## Human verification

- [ ] <checklist item>

## Out of scope

- <file or area, and why>
