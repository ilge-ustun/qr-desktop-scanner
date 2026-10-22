// The CI workflows and Dependabot config are text GitHub reads, and they run
// only on GitHub. These tests read them with a small block-style line reader
// (a YAML subset, not a parser) and check the least-privilege settings sit at
// the named places. They do not prove the files are valid workflow syntax.
import { describe, expect, it } from "vitest";

import dependabotRaw from "../../.github/dependabot.yml?raw";
import macosRaw from "../../.github/workflows/macos.yml?raw";
import releaseRaw from "../../.github/workflows/release.yml?raw";

type Line = { indent: number; text: string };

/** Drops comments, trailing whitespace and empty lines; keeps the indent. */
function read(raw: string): Line[] {
  const lines: Line[] = [];
  for (const full of raw.split("\n")) {
    const text = full.replace(/(^|[ \t])#.*$/, "$1").trimEnd();
    if (text.trim() === "") continue;
    const indent = text.length - text.trimStart().length;
    lines.push({ indent, text: text.trimStart() });
  }
  return lines;
}

const unquote = (v: string) => v.replace(/^(["'])(.*)\1$/, "$2");

/** `<key>:` with an optional value; a leading `- ` is looked through. */
function keyLine(line: Line): { key: string; value: string } | null {
  const m = /^(?:- +)?([^\s:"'{[-][^:]*):(?: (.*))?$/.exec(line.text);
  return m ? { key: m[1], value: unquote((m[2] ?? "").trim()) } : null;
}

const flat = (lines: Line[]) => lines.map((l) => " ".repeat(l.indent) + l.text);

/** The lines after `lines[i]` with a greater indent. */
function block(lines: Line[], i: number): Line[] {
  const out: Line[] = [];
  for (let j = i + 1; j < lines.length && lines[j].indent > lines[i].indent; j++)
    out.push(lines[j]);
  return out;
}

/** Key lines at the block's own (smallest) indent, as `key: value` texts. */
function topKeys(lines: Line[]): string[] {
  if (lines.length === 0) return [];
  const min = Math.min(...lines.map((l) => l.indent));
  return lines
    .filter((l) => l.indent === min)
    .map((l) => l.text)
    .sort();
}

function keyIndexes(lines: Line[], key: string): number[] {
  return lines.flatMap((l, i) => (keyLine(l)?.key === key ? [i] : []));
}

/** List items directly inside the block; the dash line is rewritten as a key line. */
function items(lines: Line[]): Line[][] {
  if (lines.length === 0) return [];
  const min = Math.min(...lines.filter((l) => l.text.startsWith("- ")).map((l) => l.indent));
  const out: Line[][] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indent !== min || !lines[i].text.startsWith("- ")) continue;
    out.push([lines[i], ...block(lines, i)]);
  }
  return out;
}

/** Item lines with the dash replaced by its width, so key lines share one indent. */
function itemLines(item: Line[]): Line[] {
  const m = /^- +/.exec(item[0].text)!;
  return [
    { indent: item[0].indent + m[0].length, text: item[0].text.slice(m[0].length) },
    ...item.slice(1),
  ];
}

function itemsOf(lines: Line[], key: string): Line[][] {
  const at = keyIndexes(lines, key);
  expect(at).toHaveLength(1);
  return items(block(lines, at[0]));
}

function steps(lines: Line[]): Line[][] {
  return keyIndexes(lines, "steps").flatMap((i) => items(block(lines, i)));
}

function noFlow(lines: Line[]) {
  for (const l of lines) expect(l.text, `flow style: ${l.text}`).not.toMatch(/[{[]/);
}

/** The one top-level `permissions` key: indent 0, no value; returns its block. */
function topPermissions(lines: Line[]): Line[] {
  const at = keyIndexes(lines, "permissions");
  expect(at).toHaveLength(1);
  expect(lines[at[0]].indent).toBe(0);
  expect(keyLine(lines[at[0]])!.value).toBe("");
  const b = block(lines, at[0]);
  noFlow(b);
  return b;
}

const macos = read(macosRaw);
const release = read(releaseRaw);
const dependabot = read(dependabotRaw);

describe("AC1 macos.yml grants its token contents: read only", () => {
  it("has one top-level permissions block that is exactly contents: read", () => {
    const b = topPermissions(macos);
    expect(b).toHaveLength(1);
    expect(topKeys(b)).toEqual(["contents: read"]);
  });

  it("names no write permission anywhere", () => {
    for (const l of macos) expect(l.text).not.toMatch(/\bwrite\b/);
  });
});

describe("AC2 release.yml checkout keeps no credential and restores no cache", () => {
  it("every actions/checkout step sets persist-credentials: false in its with block", () => {
    const checkouts = steps(release).filter((s) =>
      itemLines(s).some((l) => {
        const k = keyLine(l);
        return k?.key === "uses" && k.value.startsWith("actions/checkout@");
      }),
    );
    expect(checkouts.length).toBeGreaterThanOrEqual(1);
    for (const step of checkouts) {
      const lines = itemLines(step);
      const keyIndent = lines[0].indent;
      const withAt = lines.findIndex((l) => l.indent === keyIndent && keyLine(l)?.key === "with");
      expect(withAt, "checkout step has no with").toBeGreaterThanOrEqual(0);
      const w = block(lines, withAt);
      noFlow(w);
      expect(w.map((l) => l.text)).toContain("persist-credentials: false");
    }
  });

  it("names no rust-cache or actions/cache", () => {
    for (const l of release) {
      expect(l.text).not.toContain("rust-cache");
      expect(l.text).not.toContain("actions/cache");
    }
  });
});

describe("AC3 release.yml keeps its permissions and one job; actions stay SHA-pinned", () => {
  it("release.yml permissions are exactly contents, id-token and attestations: write", () => {
    const b = topPermissions(release);
    expect(b).toHaveLength(3);
    expect(topKeys(b)).toEqual([
      "attestations: write",
      "contents: write",
      "id-token: write",
    ]);
  });

  it("release.yml has exactly one job, release", () => {
    const at = keyIndexes(release, "jobs");
    expect(at).toHaveLength(1);
    expect(release[at[0]].indent).toBe(0);
    expect(topKeys(block(release, at[0]))).toEqual(["release:"]);
  });

  it.each([
    ["macos.yml", macos],
    ["release.yml", release],
  ])("every uses in %s is pinned to a 40-hex commit SHA", (_name, lines) => {
    const uses = lines.map(keyLine).filter((k) => k?.key === "uses");
    expect(uses.length).toBeGreaterThan(0);
    for (const k of uses)
      expect(k!.value).toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@[0-9a-f]{40}$/);
  });
});

describe("AC4 dependabot.yml covers actions, npm and cargo", () => {
  const ecosystems = () => itemsOf(dependabot, "updates");
  const ecosystem = (name: string) =>
    ecosystems().filter((i) => keyLine(i[0])!.value === name);

  it("is version 2 in block style", () => {
    noFlow(dependabot);
    expect(flat(dependabot)).toContain("version: 2");
    expect(dependabot.find((l) => l.text === "version: 2")!.indent).toBe(0);
  });

  it("has exactly one item each for github-actions, npm and cargo", () => {
    const at = keyIndexes(dependabot, "updates");
    expect(dependabot[at[0]].indent).toBe(0);
    const all = ecosystems();
    expect(all).toHaveLength(3);
    expect(all.map((i) => keyLine(i[0])!.value).sort()).toEqual(["cargo", "github-actions", "npm"]);
  });

  it("keeps the github-actions item as it was", () => {
    const [item] = ecosystem("github-actions");
    expect(flat(item)).toEqual([
      "  - package-ecosystem: github-actions",
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
    ]);
  });

  it.each(["npm", "cargo"])("%s: weekly, develop, grouped minor and patch", (name) => {
    const [raw] = ecosystem(name);
    const item = itemLines(raw);
    const indent = item[0].indent;
    const keys = item.filter((l) => l.indent === indent);
    expect(keys.map((l) => keyLine(l)!.key).sort()).toEqual([
      "directory",
      "groups",
      "package-ecosystem",
      "schedule",
      "target-branch",
    ]);
    const at = (k: string) => item.findIndex((l) => l.indent === indent && keyLine(l)?.key === k);
    expect(keyLine(item[at("directory")])!.value).toBe("/");
    expect(keyLine(item[at("target-branch")])!.value).toBe("develop");
    expect(item[at("schedule")].text).toBe("schedule:");
    expect(block(item, at("schedule")).map((l) => l.text)).toEqual(["interval: weekly"]);

    const groups = block(item, at("groups"));
    const groupKeys = groups.filter((l) => l.indent === groups[0].indent);
    expect(groupKeys).toHaveLength(1);
    const group = block(groups, 0);
    expect(topKeys(group).map((t) => t.replace(/:.*$/, "")).sort()).toEqual([
      "patterns",
      "update-types",
    ]);
    const patterns = group.findIndex((l) => keyLine(l)?.key === "patterns");
    const types = group.findIndex((l) => keyLine(l)?.key === "update-types");
    const p = block(group, patterns).map((l) => l.text);
    expect(p).toHaveLength(1);
    expect(['- "*"', "- '*'"]).toContain(p[0]);
    const t = block(group, types).map((l) => l.text);
    expect([...t].sort()).toEqual(["- minor", "- patch"]);
  });
});
