// Story 014: the rules that decide what a card shows are in src/lib, where a
// test reaches them without rendering a card. These tests read the source of
// src/components and src/lib as text, comments removed. They prove where a
// rule is written, not that it is right: a rule written again under other
// names goes unseen, and the reviewer reads the diff for that.
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { imports, importsOf, matches, sources, type Source } from "./sourceText";

/** Every .ts and .tsx file under src/components/ and src/lib/, as text. No
 * type argument: vitest caches a transformed file on disk unless its text
 * holds "import.meta.glob(", and a cached copy would miss a file added since. */
const DOMAIN: Record<string, string> = import.meta.glob(["/src/components/**/*.{ts,tsx}", "/src/lib/**/*.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const RESULT_CARD = "/src/components/ResultCard.tsx";
const WIFI_CARD = "/src/components/WifiCard.tsx";
const FIELD_CARD = "/src/components/FieldCard.tsx";
const PAYLOAD = "/src/lib/payload.ts";
const URL_SAFETY = "/src/lib/urlSafety.ts";
const WIFI = "/src/lib/wifi.ts";
const CARD_MODEL = "/src/lib/cardModel.ts";
const COMPONENTS = "/src/components/";
const LIB = "/src/lib/";

const SOURCES = sources(DOMAIN);

describe("the files the source tests read", () => {
  it("are every .ts and .tsx file under src/components/ and src/lib/, the cards and their rules among them", () => {
    const files = Object.keys(DOMAIN);
    for (const file of [RESULT_CARD, WIFI_CARD, FIELD_CARD, PAYLOAD, URL_SAFETY, WIFI, CARD_MODEL]) {
      expect(files).toContain(file);
    }
    expect(files.filter((f) => !/^\/src\/(components|lib)\/.+\.tsx?$/.test(f))).toEqual([]);
  });
});

/** What AC3 (c) finds. */
function wifiModule(all: Source[]) {
  return {
    payloadImportsWifi: imports(all, PAYLOAD, WIFI),
    payloadParser: [/\bfunction\s+parseWifi\b/, /\bunquote\b/, /\binValue\b/].map(
      (p) => matches(all, p)[PAYLOAD] ?? 0,
    ),
    wifiNetworkTypes: matches(all, /\btype\s+WifiNetwork\s*=/),
  };
}

describe("AC3 (c) the Wi-Fi parser lives in src/lib/wifi.ts, and payload.ts takes it from there", () => {
  it("payload.ts imports wifi.ts and holds no parser of its own", () => {
    const found = wifiModule(SOURCES);
    expect(found.payloadImportsWifi).toBe(true);
    expect(found.payloadParser).toEqual([0, 0, 0]);
  });

  it("type WifiNetwork = is written once, in wifi.ts", () => {
    expect(wifiModule(SOURCES).wifiNetworkTypes).toEqual({ [WIFI]: 1 });
  });
});

/** The rules that moved to src/lib, as they were written in the components. */
const RULES = [
  // The Wi-Fi label.
  /\bSECURITY\b/,
  /WPA/,
  /open network/,
  /\.security\b/,
  /\.hidden\b/,
  // The geo rules.
  /\bmapsLink\b/,
  /\bcoordinates\b/,
  /"Coordinates"/,
  /Open in Maps/,
  /Copy place/,
  // The contact rules.
  /\b(phones|emails|organisations|websites)\b/,
  /"Organisation"/,
  /"Website"/,
  /Copy name/,
  // The SMS and phone rules.
  /"Message"/,
  /Copy number/,
  // A component that reads a parsed part.
  /\.(contact|sms|geo)\b/,
  // The tone and its label.
  /\bseverity\b/,
  /check before opening/,
];

const WRAPPERS = [
  "/src/components/ContactCard.tsx",
  "/src/components/GeoCard.tsx",
  "/src/components/SmsCard.tsx",
  "/src/components/PhoneCard.tsx",
];

/** The paths a file's relative export … from declarations name. */
function reExportsOf(source: Source): string[] {
  return source.ast.statements
    .filter(ts.isExportDeclaration)
    .flatMap((d) => (d.moduleSpecifier && ts.isStringLiteral(d.moduleSpecifier) ? [d.moduleSpecifier.text] : []))
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => new URL(specifier, `file://${source.file}`).pathname);
}

const calls = (all: Source[], file: string, pattern: RegExp) => (matches(all, pattern)[file] ?? 0) > 0;

/** What AC4 (a) to (d) find. */
function cardRules(all: Source[]) {
  const underComponents = (counts: Record<string, number>) =>
    Object.keys(counts).filter((f) => f.startsWith(COMPONENTS));
  return {
    rules: Object.fromEntries(RULES.map((p) => [p.source, underComponents(matches(all, p))])),
    wrappers: WRAPPERS.filter((f) => all.some((s) => s.file === f)),
    resultCard: {
      importsCardModel: imports(all, RESULT_CARD, CARD_MODEL),
      importsUrlSafety: imports(all, RESULT_CARD, URL_SAFETY),
      fieldCardModel: calls(all, RESULT_CARD, /\bfieldCardModel\b/),
      toneOf: calls(all, RESULT_CARD, /\btoneOf\b/),
      linkMeta: calls(all, RESULT_CARD, /\blinkMeta\b/),
    },
    wifiCard: {
      importsWifi: imports(all, WIFI_CARD, WIFI),
      wifiMeta: calls(all, WIFI_CARD, /\bwifiMeta\b/),
    },
    libComponentImports: all
      .filter((s) => s.file.startsWith(LIB))
      .flatMap((s) =>
        [...importsOf(s), ...reExportsOf(s)].filter((path) => path.startsWith(COMPONENTS)).map((path) => `${s.file} → ${path}`),
      ),
    toneTypes: matches(all, /\btype\s+Tone\s*=/),
  };
}

describe("AC4 the components hold no moved rule, the wrappers are gone, src/lib imports no component", () => {
  const found = cardRules(SOURCES);

  it("(a) no file under src/components/ matches a moved rule", () => {
    expect(found.rules).toEqual(Object.fromEntries(RULES.map((p) => [p.source, []])));
  });

  it("(b) ContactCard, GeoCard, SmsCard and PhoneCard are gone", () => {
    expect(found.wrappers).toEqual([]);
  });

  it("(c) ResultCard calls fieldCardModel, toneOf and linkMeta; WifiCard calls wifiMeta", () => {
    expect(found.resultCard).toEqual({
      importsCardModel: true,
      importsUrlSafety: true,
      fieldCardModel: true,
      toneOf: true,
      linkMeta: true,
    });
    expect(found.wifiCard).toEqual({ importsWifi: true, wifiMeta: true });
  });

  it("(d) no file under src/lib/ imports a component, and type Tone = is written once, under src/lib/", () => {
    expect(found.libComponentImports).toEqual([]);
    const files = Object.keys(found.toneTypes);
    expect(files).toHaveLength(1);
    expect(files[0].startsWith(LIB), files[0]).toBe(true);
    expect(found.toneTypes[files[0]]).toBe(1);
  });

  it("(e) a comment with every rule, type Tone = and an import of a component, in every file, changes nothing", () => {
    const names = [
      'SECURITY WPA open network .security .hidden mapsLink coordinates "Coordinates" Open in Maps Copy place',
      'phones emails organisations websites "Organisation" "Website" Copy name "Message" Copy number',
      ".contact .sms .geo severity check before opening type Tone = type WifiNetwork = function parseWifi unquote inValue",
      'fieldCardModel toneOf linkMeta wifiMeta import { KeyedButton } from "../components/Ink";',
    ].join(" ");
    for (const p of RULES) expect(names).toMatch(p);
    const comment = (text: string) => `// ${names}\n/* ${names} */\n${text}\n// ${names}\n`;
    const commented = sources(Object.fromEntries(Object.entries(DOMAIN).map(([file, text]) => [file, comment(text)])));
    expect(cardRules(commented)).toEqual(cardRules(SOURCES));
    expect(wifiModule(commented)).toEqual(wifiModule(SOURCES));
  });
});

/** Every node under `node`. */
function descendants(node: ts.Node): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (n: ts.Node) => {
    found.push(n);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

const isPayload = (node: ts.Node) => ts.isIdentifier(node) && node.text === "payload";

/** `const x: never = payload` or `payload satisfies never`. */
function bindsNever(node: ts.Node): boolean {
  if (ts.isVariableDeclaration(node)) {
    return (
      node.type?.kind === ts.SyntaxKind.NeverKeyword && node.initializer !== undefined && isPayload(node.initializer)
    );
  }
  return ts.isSatisfiesExpression(node) && isPayload(node.expression) && node.type.kind === ts.SyntaxKind.NeverKeyword;
}

/** What AC5 finds in a file: the switches over payload.kind, whether the one
 * switch's default binds payload to never, the lines of each if on a .kind,
 * and the counts of .trim(, a test for "phone" and a directive that silences
 * tsc. */
function kindSwitch(file: string, text: string) {
  const [{ ast, code }] = sources({ [file]: text });
  const nodes = descendants(ast);
  const line = (n: ts.Node) => ast.getLineAndCharacterOfPosition(n.getStart(ast)).line + 1;
  const switches = nodes.filter(ts.isSwitchStatement).filter((s) => s.expression.getText(ast) === "payload.kind");
  const defaults = switches.flatMap((s) => s.caseBlock.clauses.filter(ts.isDefaultClause));
  const count = (text: string, pattern: RegExp) => text.match(new RegExp(pattern.source, "g"))?.length ?? 0;
  return {
    switches: switches.length,
    neverDefault: switches.length === 1 && defaults.length === 1 && descendants(defaults[0]).some(bindsNever),
    kindIfs: nodes.filter(ts.isIfStatement).filter((i) => /\.kind\b/.test(i.expression.getText(ast))).map(line),
    trims: count(code, /\.trim\(/),
    phoneTests: count(code, /kind\s*[!=]==?\s*"phone"/),
    directives: count(text, /@ts-(ignore|nocheck|expect-error)/),
  };
}

describe("AC5 ResultCard picks the card with one switch over payload.kind, its default binding payload to never", () => {
  const found = kindSwitch(RESULT_CARD, DOMAIN[RESULT_CARD]);

  it("(a) one switch over payload.kind, with a default that binds payload to never", () => {
    expect({ switches: found.switches, neverDefault: found.neverDefault }).toEqual({
      switches: 1,
      neverDefault: true,
    });
  });

  it("(b) no if on a .kind", () => {
    expect(found.kindIfs).toEqual([]);
  });

  it('(c) no .trim( and no test of kind against "phone"', () => {
    expect({ trims: found.trims, phoneTests: found.phoneTests }).toEqual({ trims: 0, phoneTests: 0 });
  });

  it("(d) no @ts-ignore, @ts-nocheck or @ts-expect-error, comments included", () => {
    expect(found.directives).toBe(0);
  });

  it("tells the forms apart: payload bound or satisfied as never passes; a cast, no binding or two switches fail", () => {
    const sample = (body: string) => kindSwitch("/sample.ts", `function pick(payload: { kind: "a" }) {\n${body}\n}`);
    const switchWith = (fallback: string) =>
      `switch (payload.kind) {\ncase "a":\nreturn 1;\ndefault: {\n${fallback}\n}\n}`;
    const never = switchWith("const x: never = payload;\nreturn x;");
    expect(sample(never)).toEqual({
      switches: 1,
      neverDefault: true,
      kindIfs: [],
      trims: 0,
      phoneTests: 0,
      directives: 0,
    });
    expect(sample(switchWith("return payload satisfies never;")).neverDefault).toBe(true);
    expect(sample(switchWith("return 0;")).neverDefault).toBe(false);
    expect(sample(switchWith("const x: never = payload as never;\nreturn x;")).neverDefault).toBe(false);
    expect(sample(switchWith("const x: string = payload;\nreturn x;")).neverDefault).toBe(false);
    expect(sample(`${switchWith("return 0;")}\n${never}`)).toMatchObject({ switches: 2, neverDefault: false });
  });

  it("finds an if on a .kind, a .trim(, a test for phone and a directive, but not in a comment", () => {
    const sample = (body: string) => kindSwitch("/sample.ts", `function pick(payload: { kind: "a" }) {\n${body}\n}`);
    expect(sample(`if (payload.kind === "a" && payload) return 0;`).kindIfs).toEqual([2]);
    expect(sample(`return payload.kind === "phone" && "x".trim();`)).toMatchObject({ trims: 1, phoneTests: 1 });
    expect(sample(`// "x".trim() kind === "phone"\nreturn 0;`)).toMatchObject({ trims: 0, phoneTests: 0 });
    expect(sample(`// @ts-ignore\nreturn 0;`).directives).toBe(1);
  });
});
