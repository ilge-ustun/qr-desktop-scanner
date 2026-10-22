// Story 013: the copy timer, the card frame and the keyed button are each
// written once, and the cards import that one place. These tests read the
// popover's source as text, comments removed. They prove where code lives,
// not that it is good; a name built from pieces ("card" + "-head") goes
// unseen, and the reviewer reads the diff for that.
import ts from "typescript";
import { describe, expect, it } from "vitest";

/** Every .ts and .tsx file under src/ outside src/__tests__/, as text. No type
 * argument: vitest caches a transformed file on disk unless its text holds
 * "import.meta.glob(", and a cached copy would miss a file added since. */
const DOMAIN: Record<string, string> = import.meta.glob(["/src/**/*.{ts,tsx}", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const APP = "/src/App.tsx";
const FIELD_CARD = "/src/components/FieldCard.tsx";
const RESULT_CARD = "/src/components/ResultCard.tsx";
const WIFI_CARD = "/src/components/WifiCard.tsx";
const HOTKEY_BUTTON = "/src/components/HotkeyButton.tsx";
const CARD_KEYS = "/src/lib/cardKeys.ts";
const CARDS = [FIELD_CARD, RESULT_CARD, WIFI_CARD];

type Source = { file: string; ast: ts.SourceFile; code: string };

function parse(file: string, text: string): ts.SourceFile {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

/**
 * The text with each comment blanked, newlines kept. A comment is in the
 * trivia before a token, as the compiler reads it, so a // inside a string, a
 * template or JSX text stays code.
 */
function stripComments(ast: ts.SourceFile): string {
  const text = ast.text;
  const comments = new Map<number, number>();
  const visit = (node: ts.Node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    // JSX text has no trivia: what looks like a comment there is text.
    if (ts.isTokenKind(node.kind) && node.kind !== ts.SyntaxKind.JsxText) {
      // Trailing: on the line the trivia starts on; leading: on the lines after.
      const trivia = [
        ...(ts.getTrailingCommentRanges(text, node.pos) ?? []),
        ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ];
      for (const c of trivia) comments.set(c.pos, c.end);
    }
    node.getChildren(ast).forEach(visit);
  };
  visit(ast);
  let code = text;
  for (const [pos, end] of comments) {
    code = code.slice(0, pos) + code.slice(pos, end).replace(/[^\n]/g, " ") + code.slice(end);
  }
  return code;
}

function sources(domain: Record<string, string>): Source[] {
  return Object.entries(domain).map(([file, text]) => {
    const ast = parse(file, text);
    return { file, ast, code: stripComments(ast) };
  });
}

/** How often `pattern` matches in each file's code, for the files it matches. */
function matches(all: Source[], pattern: RegExp): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { file, code } of all) {
    const n = code.match(new RegExp(pattern.source, "g"))?.length ?? 0;
    if (n) counts[file] = n;
  }
  return counts;
}

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/** The files holding each numeric literal whose value is `value`, once per literal. */
function numberLiterals(all: Source[], value: number): string[] {
  const found: string[] = [];
  for (const { file, ast } of all) {
    const visit = (node: ts.Node) => {
      if (ts.isNumericLiteral(node) && Number(node.getText(ast).replace(/_/g, "")) === value) found.push(file);
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return found;
}

/** What each relative import declaration names, joined to the file's folder. */
function importsOf(source: Source): string[] {
  return source.ast.statements
    .filter(ts.isImportDeclaration)
    .map((d) => (d.moduleSpecifier as ts.StringLiteral).text)
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => new URL(specifier, `file://${source.file}`).pathname);
}

/** Whether `importer` has an import of `target`, with or without its extension. */
function imports(all: Source[], importer: string, target: string): boolean {
  const source = all.find((s) => s.file === importer);
  expect(source, importer).toBeDefined();
  return importsOf(source!).some((path) => path === target || path === target.replace(/\.tsx?$/, ""));
}

/** The one file other than HotkeyButton.tsx that starts a timer: H. */
function timerFile(all: Source[]): string {
  const files = Object.keys(matches(all, /\bset(Timeout|Interval)\b/)).filter((f) => f !== HOTKEY_BUTTON);
  expect(files).toHaveLength(1);
  return files[0];
}

const SOURCES = sources(DOMAIN);

describe("the files the source tests read", () => {
  it("are every .ts and .tsx file under src/, the popover's named ones among them, and no test", () => {
    const files = Object.keys(DOMAIN);
    for (const file of [
      APP,
      "/src/main.tsx",
      FIELD_CARD,
      RESULT_CARD,
      WIFI_CARD,
      HOTKEY_BUTTON,
      "/src/components/Ink.tsx",
      CARD_KEYS,
    ]) {
      expect(files).toContain(file);
    }
    expect(files.filter((f) => !/^\/src\/.+\.tsx?$/.test(f))).toEqual([]);
    expect(files.filter((f) => f.startsWith("/src/__tests__/"))).toEqual([]);
  });

  it("are read as code: comments do not count, a // in a string, a template or JSX text does", () => {
    const sample = [
      "// setTimeout(() => {}, 1500)",
      'const url = "https://example.com"; /* card-head */',
      "const tail = `${url}//titles`;",
      "const el = <p className={`card ${tail}`}>it's a // card-head {/* aria-keyshortcuts */}</p>;",
      "/** SHORTCUTS */",
    ].join("\n");
    const [source] = sources({ "/sample.tsx": sample });
    expect(source.code.split("\n").map((l) => l.replace(/\s+/g, " ").trim())).toEqual([
      "",
      'const url = "https://example.com";',
      "const tail = `${url}//titles`;",
      "const el = <p className={`card ${tail}`}>it's a // card-head { }</p>;",
      "",
    ]);
  });
});

describe("AC2 the copy timer is written once, in a file H the cards import", () => {
  it("(a) setTimeout or setInterval: twice, once in H and once in HotkeyButton.tsx", () => {
    const timers = matches(SOURCES, /\bset(Timeout|Interval)\b/);
    expect(total(timers)).toBe(2);
    expect(timers[HOTKEY_BUTTON]).toBe(1);
    expect(timers[timerFile(SOURCES)]).toBe(1);
  });

  it("(b) a numeric literal of 1500: once, in H", () => {
    expect(numberLiterals(SOURCES, 1500)).toEqual([timerFile(SOURCES)]);
  });

  it("(c) FieldCard, ResultCard and WifiCard import H and keep no effect of their own", () => {
    const h = timerFile(SOURCES);
    for (const card of CARDS) expect(imports(SOURCES, card, h), `${card} imports ${h}`).toBe(true);
    expect(Object.keys(matches(SOURCES, /\buse(Layout)?Effect\b/)).filter((f) => CARDS.includes(f))).toEqual([]);
  });
});

/** The one file that writes card-head: C. */
function frameFile(all: Source[]): string {
  const files = Object.keys(matches(all, /card-head/));
  expect(files).toHaveLength(1);
  return files[0];
}

describe("AC3 the card frame is written once, in a file C the cards and App import", () => {
  it("(a) card-head and titles: once each, both in C; <DismissButton at most once, only in C", () => {
    const c = frameFile(SOURCES);
    expect(matches(SOURCES, /card-head/)).toEqual({ [c]: 1 });
    expect(matches(SOURCES, /\btitles\b/)).toEqual({ [c]: 1 });
    const dismiss = matches(SOURCES, /<DismissButton\b/);
    expect(total(dismiss)).toBeLessThanOrEqual(1);
    expect(Object.keys(dismiss).filter((f) => f !== c)).toEqual([]);
  });

  it("(b) FieldCard, ResultCard, WifiCard and App import C", () => {
    const c = frameFile(SOURCES);
    for (const file of [...CARDS, APP]) expect(imports(SOURCES, file, c), `${file} imports ${c}`).toBe(true);
  });

  it("(c) the three card files write no <article or <header; App one <header, its top bar", () => {
    const articles = matches(SOURCES, /<article\b/);
    const headers = matches(SOURCES, /<header\b/);
    for (const card of CARDS) {
      expect(articles[card], card).toBeUndefined();
      expect(headers[card], card).toBeUndefined();
    }
    expect(headers[APP]).toBe(1);
  });
});

/** The one file that writes aria-keyshortcuts: K. */
function keyedFile(all: Source[]): string {
  const files = Object.keys(matches(all, /aria-keyshortcuts/));
  expect(files).toHaveLength(1);
  return files[0];
}

describe("AC4 a keyed button names its key once, in a file K the cards import", () => {
  it("(a) aria-keyshortcuts: once, in K, for the ghost and the primary look alike", () => {
    const k = keyedFile(SOURCES);
    expect(matches(SOURCES, /aria-keyshortcuts/)).toEqual({ [k]: 1 });
  });

  it("(b) SHORTCUTS: only in src/lib/cardKeys.ts and K", () => {
    const k = keyedFile(SOURCES);
    const readers = Object.keys(matches(SOURCES, /\bSHORTCUTS\b/));
    expect(readers).toContain(CARD_KEYS);
    expect(readers.filter((f) => f !== k && f !== CARD_KEYS)).toEqual([]);
  });

  it("(c) FieldCard, ResultCard and WifiCard import K", () => {
    const k = keyedFile(SOURCES);
    for (const card of CARDS) expect(imports(SOURCES, card, k), `${card} imports ${k}`).toBe(true);
  });
});

describe("comments", () => {
  it("added to every file, holding each counted name, change no count", () => {
    const names = "setTimeout(() => {}, 1500) 1_500 card-head titles <DismissButton <header <article aria-keyshortcuts SHORTCUTS useEffect useLayoutEffect";
    const commented = sources(
      Object.fromEntries(Object.entries(DOMAIN).map(([file, text]) => [file, `// ${names}\n/* ${names} */\n${text}\n// ${names}\n`])),
    );
    const report = (all: Source[]) => ({
      patterns: [
        /\bset(Timeout|Interval)\b/,
        /\buse(Layout)?Effect\b/,
        /card-head/,
        /\btitles\b/,
        /<DismissButton\b/,
        /<header\b/,
        /<article\b/,
        /aria-keyshortcuts/,
        /\bSHORTCUTS\b/,
      ].map((p) => matches(all, p)),
      literals: numberLiterals(all, 1500),
      imports: all.map((s) => [s.file, importsOf(s)]),
    });
    expect(report(commented)).toEqual(report(SOURCES));
  });
});
