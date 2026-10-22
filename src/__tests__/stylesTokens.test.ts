// Story 017: styles.css takes its raw colours and the disabled opacity from
// :root tokens, and .secret and .field share one rule. The CSS is read as
// text; no test computes a style.
import { describe, expect, it } from "vitest";

import raw from "../styles.css?raw";

const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

type Rule = { selector: string; body: string };

function rules(text: string): Rule[] {
  const out: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of text.matchAll(re)) out.push({ selector: squash(m[1]), body: m[2] });
  return out;
}

function declarations(body: string): string[] {
  return body
    .split(/;(?![^(]*\))/)
    .map(squash)
    .filter(Boolean)
    .map((d) => d.replace(/\s*:\s*/, ": "));
}

const ALL = rules(css);
const rootBlock = ALL.filter((r) => r.selector === ":root");
const root = new Map<string, string>();
for (const d of declarations(rootBlock.map((r) => r.body).join(";"))) {
  const [name, ...value] = d.split(": ");
  if (name.startsWith("--")) root.set(name, value.join(": "));
}

function ruleFor(selector: string): Rule {
  const found = ALL.filter((r) => r.selector === selector);
  expect(found, selector).toHaveLength(1);
  return found[0];
}

function valueOf(selector: string, property: string): string {
  const d = declarations(ruleFor(selector).body).find((x) => x.startsWith(`${property}: `));
  expect(d, `${selector} ${property}`).toBeDefined();
  return d!.slice(property.length + 2);
}

const ROWS = [
  { selector: "button:disabled", property: "opacity", before: "0.55", after: "var(--X)" },
  { selector: ".keyed > button:disabled + .keycap", property: "opacity", before: "0.55", after: "var(--X)" },
  { selector: "button.risky", property: "background", before: "rgba(255, 116, 119, 0.25)", after: "var(--X)" },
  { selector: "button.hotkey:hover", property: "background", before: "rgba(255, 116, 119, 0.2)", after: "var(--X)" },
  {
    selector: ".tone-warn .meta",
    property: "background",
    before: "repeating-linear-gradient(135deg, var(--orange) 0 8px, #ff9496 8px 16px)",
    after: "repeating-linear-gradient(135deg, var(--orange) 0 8px, var(--X) 8px 16px)",
  },
];

describe("AC1 tokens", () => {
  const used: string[] = [];
  for (const row of ROWS) {
    it(`AC1 ${row.selector} ${row.property} takes a token holding the old value`, () => {
      const value = valueOf(row.selector, row.property);
      const form = squash(row.after)
        .replace(/[().*+?^${}|[\]\\]/g, "\\$&")
        .replace("var\\(--X\\)", "var\\((--[\\w-]+)\\)");
      const m = value.match(new RegExp(`^${form}$`));
      expect(m, `${row.selector}: ${value}`).not.toBeNull();
      const name = m![1];
      used.push(name);
      const token = root.get(name);
      expect(token, name).toBeDefined();
      expect(token).not.toContain("var(");
      const rebuilt = value.replace(`var(${name})`, token!).toLowerCase();
      expect(rebuilt).toBe(row.before.toLowerCase());
    });
  }
  it("AC1 both opacity rows name the same token", () => {
    const a = valueOf(ROWS[0].selector, "opacity");
    const b = valueOf(ROWS[1].selector, "opacity");
    expect(a).toMatch(/^var\(--[\w-]+\)$/);
    expect(a).toBe(b);
  });
});

describe("AC2 no literals outside :root", () => {
  const outside = ALL.filter((r) => r.selector !== ":root")
    .map((r) => `${r.selector} {${r.body}}`)
    .join("\n");
  const cases: [string, RegExp][] = [
    ["a hex colour", /#[0-9a-f]{3,8}(?![\w-])/i],
    ["a colour function", /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i],
    ["the orange triplet", /255\D{1,3}116\D{1,3}119/],
    ["the number 0.55", /(?<![\d.])0?\.55(?!\d)/],
  ];
  for (const [name, re] of cases) {
    it(`AC2 has no ${name}`, () => {
      expect(outside.match(new RegExp(re.source, re.flags.includes("i") ? "gi" : "g"))).toBeNull();
    });
  }
  it("AC2 :root declares exactly one custom property whose whole value is 0.55", () => {
    const holding = [...root].filter(([, v]) => /^0?\.55$/.test(v));
    expect(holding).toHaveLength(1);
  });
});

describe("AC3 .secret and .field share a rule", () => {
  it("AC3 dotted occurs once, in a rule for exactly .secret and .field", () => {
    expect(css.match(/dotted/g)).toHaveLength(1);
    const shared = ALL.filter((r) => r.body.includes("dotted"));
    expect(shared).toHaveLength(1);
    expect(
      shared[0].selector
        .split(",")
        .map((s) => s.trim())
        .sort(),
    ).toEqual([".field", ".secret"]);
    expect(declarations(shared[0].body).sort()).toEqual(
      [
        "display: flex",
        "align-items: center",
        "justify-content: space-between",
        "gap: 10px",
        "border-top: 2px dotted var(--ink)",
      ].sort(),
    );
  });
  it("AC3 each keeps only its own padding", () => {
    expect(declarations(ruleFor(".secret").body)).toEqual(["padding-top: 10px"]);
    expect(declarations(ruleFor(".field").body)).toEqual(["padding: 8px 0"]);
  });
});
