// Story 016, AC2, AC5 and AC7: where the parsers' shared code lives. These
// tests read src/lib as code, comments left out. They prove where a literal
// is written, not that the code is good: a prefix built from pieces, or a
// backslash made from a char code, goes unseen. The reviewer reads the diff.
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { parse } from "./sourceText";

/** No type argument: see cardLogicSources.test.ts. */
const LIB: Record<string, string> = import.meta.glob("/src/lib/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const SRC: Record<string, string> = import.meta.glob(["/src/**/*.ts", "/src/**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const NEW_TESTS = ["text", "parserSources", "prefixOnce", "wifiTable", "query"].map(
  (name) => `/src/__tests__/${name}.test.ts`,
);

const SEVEN = ["mailto:", "tel:", "sms:", "SMSTO:", "geo:", "WIFI:", "MECARD:"];
const SEVEN_UPPER = SEVEN.map((p) => p.toUpperCase());

function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/** String literals and template parts. */
function isText(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateLiteralToken {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  );
}

function isAfterPrefixArgument(node: ts.Node): boolean {
  const call = node.parent;
  return (
    ts.isCallExpression(call) &&
    ts.isIdentifier(call.expression) &&
    call.expression.text === "afterPrefix" &&
    call.arguments[1] === node
  );
}

function hasPrefix(text: string): boolean {
  const upper = text.toUpperCase();
  return SEVEN_UPPER.some((p) => upper.includes(p));
}

/** What AC2 finds in one file. */
function prefixesIn(file: string, text: string) {
  const literals: string[] = [];
  const regexes: string[] = [];
  const passed = new Set<string>();
  walk(parse(file, text), (node) => {
    if (isText(node) && isAfterPrefixArgument(node)) passed.add(node.text.toUpperCase());
    else if (isText(node) && hasPrefix(node.text)) literals.push(node.text);
    else if (ts.isRegularExpressionLiteral(node) && hasPrefix(node.text)) regexes.push(node.text);
  });
  return { literals, regexes, passed };
}

/** The vCard escape regex: "\n" is a line break there. */
const VCARD_UNESCAPE = String.raw`/\\([\\,;nN])/g`;

/** What AC5 (b) finds in one file: literals that hold a backslash. */
function backslashesIn(file: string, text: string): string[] {
  const found: string[] = [];
  walk(parse(file, text), (node) => {
    if (isText(node) && node.text.includes("\\")) found.push(node.text);
    else if (ts.isRegularExpressionLiteral(node) && node.text.includes("\\\\")) found.push(node.text);
  });
  return found;
}

function importsNamed(file: string, text: string, from: string, name: string): boolean {
  return parse(file, text).statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      (s.moduleSpecifier as ts.StringLiteral).text === from &&
      s.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(s.importClause.namedBindings) &&
      s.importClause.namedBindings.elements.some((e) => (e.propertyName ?? e.name).text === name),
  );
}

/** The names a file exports. */
function exportsOf(file: string, text: string): string[] {
  const names: string[] = [];
  for (const s of parse(file, text).statements) {
    if (ts.isExportDeclaration(s)) {
      if (s.exportClause && ts.isNamedExports(s.exportClause))
        names.push(...s.exportClause.elements.map((e) => e.name.text));
    } else if (ts.canHaveModifiers(s) && ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(s)) {
        for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
      } else if ("name" in s && s.name && ts.isIdentifier(s.name as ts.Node)) {
        names.push((s.name as ts.Identifier).text);
      }
    }
  }
  return names;
}

function identifiersIn(file: string, text: string): Set<string> {
  const ids = new Set<string>();
  walk(parse(file, text), (node) => {
    if (ts.isIdentifier(node)) ids.add(node.text);
  });
  return ids;
}

/** The exports of `files` that no other file in `all` has an identifier for. */
function unusedExports(files: Record<string, string>, all: Record<string, string>): string[] {
  const identifiers = Object.entries(all).map(([file, text]) => ({
    file,
    ids: identifiersIn(file, text),
  }));
  const unused: string[] = [];
  for (const [file, text] of Object.entries(files)) {
    for (const name of exportsOf(file, text)) {
      if (!identifiers.some((other) => other.file !== file && other.ids.has(name))) unused.push(`${file}: ${name}`);
    }
  }
  return unused;
}

describe("the files the source tests read", () => {
  it("are the src/lib/*.ts files, text.ts among them", () => {
    expect(Object.keys(LIB)).toContain("/src/lib/text.ts");
    expect(Object.keys(LIB)).toContain("/src/lib/wifi.ts");
    expect(Object.keys(LIB)).toContain("/src/lib/contact.ts");
  });
});

describe("AC2 the seven prefixes are written only as the prefix argument of afterPrefix", () => {
  const found = Object.entries(LIB).map(([file, text]) => ({
    file,
    ...prefixesIn(file, text),
  }));

  it("no string literal outside afterPrefix holds one", () => {
    expect(found.flatMap((f) => f.literals.map((l) => `${f.file}: ${l}`))).toEqual([]);
  });

  it("no regex literal holds one", () => {
    expect(found.flatMap((f) => f.regexes.map((r) => `${f.file}: ${r}`))).toEqual([]);
  });

  it("each of the seven is passed to afterPrefix somewhere", () => {
    const passed = new Set(found.flatMap((f) => [...f.passed]));
    expect([...passed].filter((p) => SEVEN_UPPER.includes(p)).sort()).toEqual([...SEVEN_UPPER].sort());
  });

  it("the finder: a test and a slice are found, a comment and a call are not", () => {
    const sample = 'if (/^WIFI:/i.test(t)) return t.slice("WIFI:".length);';
    const hit = prefixesIn("a.ts", sample);
    expect([hit.literals.length, hit.regexes.length]).toEqual([1, 1]);
    const comment = prefixesIn("a.ts", `// ${sample}\n/* ${sample} */`);
    expect([comment.literals, comment.regexes, [...comment.passed]]).toEqual([[], [], []]);
    const call = prefixesIn("a.ts", 'afterPrefix(t, "WIFI:")');
    expect([call.literals, call.regexes, [...call.passed]]).toEqual([[], [], ["WIFI:"]]);
  });
});

describe("AC5 wifi.ts and contact.ts split with the shared splitter", () => {
  it("each imports splitUnescaped from ./text", () => {
    for (const file of ["/src/lib/wifi.ts", "/src/lib/contact.ts"]) {
      expect(importsNamed(file, LIB[file], "./text", "splitUnescaped"), file).toBe(true);
    }
  });

  it("outside text.ts and hotkey.ts, the vCard unescape regex is the only literal with a backslash", () => {
    const found = Object.entries(LIB)
      .filter(([file]) => file !== "/src/lib/text.ts" && file !== "/src/lib/hotkey.ts")
      .flatMap(([file, text]) => backslashesIn(file, text).map((l) => `${file}: ${l}`));
    expect(found).toEqual([`/src/lib/contact.ts: ${VCARD_UNESCAPE}`]);
  });

  it("the finder: a backslash literal is found, in a comment it is not", () => {
    const sample = String.raw`const f = (c: string) => c === "\\";`;
    expect(backslashesIn("a.ts", sample)).toEqual(["\\"]);
    expect(backslashesIn("a.ts", `// ${sample}`)).toEqual([]);
    expect(backslashesIn("a.ts", String.raw`const r = /\\(.)/gs;`)).toEqual([String.raw`/\\(.)/gs`]);
  });
});

describe("AC7 every export of src/lib/*.ts is used by another file", () => {
  it("no export is named only in its own file", () => {
    const others = Object.fromEntries(Object.entries(SRC).filter(([file]) => !NEW_TESTS.includes(file)));
    expect(unusedExports(LIB, others)).toEqual([]);
  });

  it("the finder: an export only its own file names is found, an imported one is not", () => {
    const a = "export const used = 1;\nexport type Lonely = string;\nexport { used as renamed };";
    const b = 'import { used } from "./a";\nconsole.log(used);';
    expect(unusedExports({ "/a.ts": a }, { "/a.ts": a, "/b.ts": b })).toEqual(["/a.ts: Lonely", "/a.ts: renamed"]);
    expect(
      unusedExports({ "/a.ts": "export function used() {}" }, { "/a.ts": "export function used() {}", "/b.ts": b }),
    ).toEqual([]);
  });
});
