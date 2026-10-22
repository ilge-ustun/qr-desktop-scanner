// The popover ships six .woff2 faces from @fontsource, declared in
// src/fonts.css, and builds for Safari 15 without the modulepreload polyfill.
// These tests read files as text; they do not show how the text looks.
import { describe, expect, it } from "vitest";

import config from "../../vite.config";
import fontsCss from "../fonts.css?raw";
import mainRaw from "../main.tsx?raw";
import indexHtml from "../../index.html?raw";
import unicodeRaw from "../../node_modules/@fontsource/sometype-mono/unicode.json?raw";

const unicode = JSON.parse(unicodeRaw) as Record<string, string>;
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (s: string) => s.replace(/\s+/g, "");

const woff2Files = Object.keys(
  import.meta.glob("../../node_modules/@fontsource/*/files/*.woff2", {
    query: "?url",
    exhaustive: true,
  }),
).map((p) => p.replace("../../", ""));

const FACES = [
  ["Silkscreen", "400", "node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2"],
  ["Silkscreen", "700", "node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff2"],
  ["Sometype Mono", "400", "node_modules/@fontsource/sometype-mono/files/sometype-mono-latin-400-normal.woff2"],
  ["Sometype Mono", "400", "node_modules/@fontsource/sometype-mono/files/sometype-mono-latin-ext-400-normal.woff2"],
  ["Sometype Mono", "600", "node_modules/@fontsource/sometype-mono/files/sometype-mono-latin-600-normal.woff2"],
  ["Sometype Mono", "600", "node_modules/@fontsource/sometype-mono/files/sometype-mono-latin-ext-600-normal.woff2"],
].map(([family, weight, file]) => `${family}|${weight}|${file}`);

function decl(body: string, prop: string): string | undefined {
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();
}

function parse() {
  const css = strip(fontsCss).trim();
  const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const rest = css.replace(/@font-face\s*\{[^}]*\}/g, "").trim();
  return { rules, rest, count: (css.match(/@(?!fontsource\/)[\w-]+/g) ?? []).length };
}

function resolveUrl(url: string): string | null {
  if (url.startsWith("@fontsource/")) return `node_modules/${url}`;
  if (url.startsWith("../node_modules/@fontsource/")) return url.slice(3);
  return null;
}

describe("AC1 src/fonts.css", () => {
  const { rules, rest, count } = parse();

  it("holds six @font-face rules and nothing else", () => {
    expect(rules).toHaveLength(6);
    expect(count).toBe(6);
    expect(rest).toBe("");
  });

  it("declares the six faces, once each, with one woff2 url that exists", () => {
    const rows = rules.map((body) => {
      expect(decl(body, "font-style")).toBe("normal");
      expect(decl(body, "font-display")).toBe("swap");
      const family = decl(body, "font-family")?.replace(/["']/g, "");
      const weight = decl(body, "font-weight");
      const src = decl(body, "src") ?? "";
      const m = /^url\(\s*(["']?)([^"')]+)\1\s*\)\s*format\(\s*(["'])woff2\3\s*\)$/.exec(src);
      expect(m, `src: ${src}`).not.toBeNull();
      const file = resolveUrl(m![2]);
      expect(file, `url: ${m![2]}`).not.toBeNull();
      expect(woff2Files, `missing ${file}`).toContain(file);
      return `${family}|${weight}|${file}`;
    });
    expect([...rows].sort()).toEqual([...FACES].sort());
  });

  it("gives Sometype Mono its subset's unicode-range and Silkscreen none", () => {
    for (const body of rules) {
      const family = decl(body, "font-family")?.replace(/["']/g, "");
      const range = decl(body, "unicode-range");
      if (family === "Silkscreen") {
        expect(range).toBeUndefined();
        continue;
      }
      const ext = /sometype-mono-latin-ext-/.test(decl(body, "src") ?? "");
      expect(squash(range ?? "")).toBe(squash(unicode[ext ? "latin-ext" : "latin"]));
    }
  });
});

describe("AC2 no other file loads fontsource CSS", () => {
  const srcFiles = import.meta.glob(["../**/*.{ts,tsx,css}", "!../__tests__/**"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const domain: Record<string, string> = { ...srcFiles, "../../index.html": indexHtml };

  it("sees the files it should", () => {
    const names = Object.keys(domain);
    for (const n of ["../main.tsx", "../App.tsx", "../styles.css", "../fonts.css"]) {
      expect(names).toContain(n);
    }
  });

  it("mentions @fontsource/ only in src/fonts.css", () => {
    const hits = Object.entries(domain)
      .filter(([, text]) => text.includes("@fontsource/"))
      .map(([name]) => name);
    expect(hits).toEqual(["../fonts.css"]);
  });

  it("imports ./fonts.css from main.tsx", () => {
    const code = mainRaw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !/^\s*\/\//.test(l))
      .join("\n");
    expect(code).toMatch(/^\s*import\s+(?:[^;]*?\sfrom\s+)?["']\.\/fonts\.css["']/m);
  });
});

describe("AC3 vite build options", () => {
  const build = (config as { build?: Record<string, unknown> }).build;

  it("targets Safari 15", () => {
    expect(build?.target).toEqual(["safari15"]);
  });

  it("drops the modulepreload polyfill", () => {
    expect(build?.modulePreload).toEqual({ polyfill: false });
  });
});
