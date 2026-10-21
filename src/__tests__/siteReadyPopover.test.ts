// The project page (site/index.html) shows the app's ready popover as a live
// HTML/CSS copy, in front of the warning screenshot, its scan bar sweeping.
// jsdom does no layout, paint or animation: these tests read the page's markup
// and what its style rules declare. They do not resolve the cascade.
import { describe, expect, it } from "vitest";

import html from "../../site/index.html?raw";

const page = new DOMParser().parseFromString(html, "text/html");

type Rule = {
  selector: string;
  style: CSSStyleDeclaration;
  /** The conditions of the @media rules around it, outermost first. */
  media: string[];
};

/** Lower case, one space for each run of whitespace, none around ( ) , / or :. */
function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*([(),/:])\s*/g, "$1");
}

/** Splits at each top-level separator, never inside ( ) or [ ]. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

// A DOMParser document has no window, so jsdom builds no sheet for its
// <style>. The text is copied into a <style> of the test's own document.
function readStyles(): { rules: Rule[]; keyframes: CSSKeyframesRule[] } {
  const styles = page.querySelectorAll("style");
  if (styles.length !== 1) throw new Error(`the page should have one <style>, it has ${styles.length}`);
  const el = document.createElement("style");
  el.textContent = styles[0].textContent;
  document.head.append(el);
  const rules: Rule[] = [];
  const keyframes: CSSKeyframesRule[] = [];
  const walk = (list: CSSRuleList, media: string[]) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        if (rule.cssRules?.length) throw new Error(`nested rules are not read: ${rule.selectorText}`);
        rules.push({ selector: rule.selectorText, style: rule.style, media });
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, [...media, norm(rule.conditionText)]);
      } else if (rule instanceof CSSKeyframesRule) {
        keyframes.push(rule);
      } else if (!(rule instanceof CSSFontFaceRule)) {
        throw new Error(`a rule this test does not read: ${rule.cssText}`);
      }
    }
  };
  walk((el.sheet as CSSStyleSheet).cssRules, []);
  return { rules, keyframes };
}

const { rules, keyframes } = readStyles();
/** The positive checks look only at these: rules outside @media. */
const topLevel = rules.filter((r) => r.media.length === 0);

/** Each declaration of a block as [name, value, important]. */
function declarations(style: CSSStyleDeclaration): [string, string, boolean][] {
  return Array.from({ length: style.length }, (_, i) => {
    const name = style.item(i);
    return [name, norm(style.getPropertyValue(name)), style.getPropertyPriority(name) === "important"];
  });
}

/** The value the rule's own block gives the property, if it gives one. */
function valueOf(rule: Rule, property: string): string | undefined {
  const value = rule.style.getPropertyValue(property);
  return value === "" ? undefined : norm(value);
}

// A part with a pseudo-element never matches.
const PSEUDO_ELEMENT = /::|:(?:before|after|first-line|first-letter)(?![\w-])/i;

/** True when one comma-separated part of the rule's selector matches the element. */
function matches(rule: Rule, el: Element): boolean {
  return splitTopLevel(rule.selector, ",").some((part) => !PSEUDO_ELEMENT.test(part) && el.matches(part));
}

/** The values that rules matching the element declare for the property. */
function declared(el: Element, property: string, scope: Rule[] = topLevel): string[] {
  return scope
    .filter((r) => matches(r, el))
    .map((r) => valueOf(r, property))
    .filter((v): v is string => v !== undefined);
}

function hides(rule: Rule, el: Element): boolean {
  if (!matches(rule, el)) return false;
  const display = valueOf(rule, "display");
  const opacity = valueOf(rule, "opacity");
  return (
    display === "none" ||
    display === "contents" ||
    valueOf(rule, "visibility") === "hidden" ||
    (opacity !== undefined && parseFloat(opacity) === 0)
  );
}

/** The rules, inside and outside @media, that hide the element or one of its ancestors. */
function hiding(el: Element): string[] {
  const found: string[] = [];
  for (let at: Element | null = el; at; at = at.parentElement) {
    for (const rule of rules) if (hides(rule, at)) found.push(`${rule.selector} hides <${at.localName}>`);
  }
  return found;
}

function isZero(length: string): boolean {
  return /^[+-]?(\d*\.)?0+([a-z]+|%)?$/.test(length) && parseFloat(length) === 0;
}

function shots(): Element {
  const all = page.querySelectorAll(".shots");
  expect(all).toHaveLength(1);
  return all[0];
}

const warningImage = () => shots().firstElementChild as Element;
const popover = () => shots().lastElementChild as Element;

function scanBar(): Element {
  const bars = popover().querySelectorAll(".scanline");
  expect(bars).toHaveLength(1);
  return bars[0];
}

describe("AC1: in .shots the warning image comes first and the live popover last", () => {
  it("AC1 (a) .shots holds the warning image, then a popover that is not a picture element", () => {
    const children = Array.from(shots().children);
    expect(children).toHaveLength(2);
    const [first, last] = children;
    expect(first.localName).toBe("img");
    expect(first.getAttribute("src")).toBe("img/warning.png");
    expect(first.getAttribute("alt")).toBe("A scanned link with two warnings: not encrypted, and a link shortener");
    expect(["img", "picture", "svg", "canvas", "object", "embed", "iframe", "video"]).not.toContain(last.localName);
    expect(last.getAttribute("role")).toBe("img");
  });

  it("AC1 (b) the page no longer refers to ready.png", () => {
    expect(html).not.toContain("ready.png");
  });

  it("AC1 (c) no rule or inline style changes the order the two are painted in", () => {
    const blocks: [string, CSSStyleDeclaration][] = [
      ...rules.map((r): [string, CSSStyleDeclaration] => [r.selector, r.style]),
      ...keyframes.flatMap((k) =>
        Array.from(k.cssRules as CSSRuleList, (f): [string, CSSStyleDeclaration] => [
          `@keyframes ${k.name} ${(f as CSSKeyframeRule).keyText}`,
          (f as CSSKeyframeRule).style,
        ]),
      ),
    ];
    const reordering = blocks.flatMap(([where, style]) =>
      declarations(style)
        .filter(
          ([name, value]) =>
            /^(-webkit-)?(z-index|order)$/.test(name) || (/transform-style$/.test(name) && value === "preserve-3d"),
        )
        .map(([name, value]) => `${where} { ${name}: ${value} }`),
    );
    expect(reordering).toEqual([]);

    expect(shots().hasAttribute("style")).toBe(false);
    expect(shots().querySelectorAll("[style]")).toHaveLength(0);
  });
});

describe("AC2: the popover is one picture, named by the old alt text, with nothing in it to focus", () => {
  it("AC2 (a) is an image named by the old alt text, not hidden from assistive technology", () => {
    expect(popover().getAttribute("role")).toBe("img");
    expect(popover().getAttribute("aria-label")).toBe("The QR Scanner popover, ready to scan");
    expect(popover().hasAttribute("aria-hidden")).toBe(false);
  });

  it("AC2 (b) hides each of its parts from assistive technology", () => {
    const parts = Array.from(popover().children);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(part.getAttribute("aria-hidden"), part.outerHTML).toBe("true");
    const text = Array.from(popover().childNodes).filter(
      (n) => n.nodeType === n.TEXT_NODE && (n.textContent ?? "").trim() !== "",
    );
    expect(text).toHaveLength(0);
  });

  it("AC2 (c) holds no control, link or anything else that takes focus", () => {
    const interactive = new Set([
      "a",
      "area",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      "iframe",
      "object",
      "embed",
      "audio",
      "video",
    ]);
    const all = [popover(), ...Array.from(popover().querySelectorAll("*"))];
    const focusable = all.filter(
      (el) =>
        interactive.has(el.localName) ||
        el.hasAttribute("tabindex") ||
        el.hasAttribute("href") ||
        el.hasAttribute("contenteditable"),
    );
    expect(focusable.map((el) => el.outerHTML)).toEqual([]);
  });

  it("AC2 (d) carries the app's words as text: title, chip, prompt, Scan and hint", () => {
    const text = (popover().textContent ?? "").toLowerCase().replace(/\s+/g, " ");
    for (const words of [
      "qr scanner",
      "⇧⌘2",
      "drag a box around",
      "any code on screen",
      "photo, pdf, paused video, web page. esc cancels.",
    ]) {
      expect(text).toContain(words);
    }
    const scan = Array.from(popover().querySelectorAll("*")).filter(
      (el) => (el.textContent ?? "").trim().toLowerCase() === "scan",
    );
    expect(scan.length).toBeGreaterThan(0);
  });
});

type Animation = { name?: string; seconds?: number; timing?: string; count?: string };

const TIMING =
  /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|cubic-bezier\(.*\)|steps\(.*\)|linear\(.*\))$/;
const OTHER_KEYWORDS = new Set([
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
  "none",
  "forwards",
  "backwards",
  "both",
  "running",
  "paused",
]);

function seconds(time: string): number | undefined {
  const m = /^([\d.]+)(m?s)$/.exec(time);
  if (!m) return undefined;
  return m[2] === "ms" ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
}

/** The animations a rule declares, from the shorthand's layers and the longhands. */
function animationsOf(rule: Rule): Animation[] {
  const layers: Animation[] = splitTopLevel(valueOf(rule, "animation") ?? "", ",").map((layer) => {
    const a: Animation = {};
    for (const token of layer.split(" ")) {
      // The first time is the duration; a second one is the delay.
      if (seconds(token) !== undefined) a.seconds ??= seconds(token);
      else if (TIMING.test(token)) a.timing = token;
      else if (token === "infinite" || /^[\d.]+$/.test(token)) a.count = token;
      else if (!OTHER_KEYWORDS.has(token)) a.name = token;
    }
    return a;
  });
  const longhands: Animation = {
    name: valueOf(rule, "animation-name"),
    seconds: seconds(valueOf(rule, "animation-duration") ?? ""),
    timing: valueOf(rule, "animation-timing-function"),
    count: valueOf(rule, "animation-iteration-count"),
  };
  if (Object.values(longhands).every((v) => v === undefined)) return layers;
  const base = layers[0] ?? {};
  const merged = Object.fromEntries(Object.entries(longhands).filter(([, v]) => v !== undefined));
  return [{ ...base, ...merged }, ...layers.slice(1)];
}

function keyframeTop(rule: CSSKeyframesRule, offset: string): string | undefined {
  let top: string | undefined;
  for (const frame of Array.from(rule.cssRules) as CSSKeyframeRule[]) {
    const keys = splitTopLevel(norm(frame.keyText), ",").map((k) => (k === "from" ? "0%" : k === "to" ? "100%" : k));
    const value = frame.style.getPropertyValue("top");
    if (keys.includes(offset) && value !== "") top = norm(value);
  }
  return top;
}

describe("AC3: only the scan bar moves, with the app's sweep, and reduced motion stops it", () => {
  it("AC3 (a) the scan bar sweeps with the app's animation, positioned in its viewfinder", () => {
    const bar = scanBar();
    const sweeps = topLevel
      .filter((r) => matches(r, bar))
      .flatMap(animationsOf)
      .filter((a) => a.name === "sweep" && a.seconds === 2.8 && a.timing === "ease-in-out" && a.count === "infinite");
    expect(sweeps.length).toBeGreaterThan(0);
    expect(declared(bar, "position")).toContain("absolute");
    expect(declared(bar.parentElement as Element, "position")).toContain("relative");
    expect(hiding(bar)).toEqual([]);
  });

  it("AC3 (b) @keyframes sweep runs top from 10% to 78% and back", () => {
    const sweep = keyframes.filter((k) => k.name === "sweep");
    expect(sweep).toHaveLength(1);
    expect(keyframeTop(sweep[0], "0%")).toBe("10%");
    expect(keyframeTop(sweep[0], "50%")).toBe("78%");
    expect(keyframeTop(sweep[0], "100%")).toBe("10%");
  });

  it("AC3 (c) nothing else on the page animates or transitions", () => {
    expect(keyframes.map((k) => k.name)).toEqual(["sweep"]);

    const bar = scanBar();
    const others = Array.from(page.querySelectorAll("*")).filter((el) => el !== bar);
    const animating = rules.filter((r) =>
      declarations(r.style).some(([name, value]) => /^(-webkit-)?animation(-name)?$/.test(name) && value !== "none"),
    );
    for (const rule of animating) {
      expect(matches(rule, bar), `${rule.selector} animates, but not the scan bar`).toBe(true);
      expect(
        others.filter((el) => matches(rule, el)).map((el) => el.outerHTML.slice(0, 80)),
        `${rule.selector} animates more than the scan bar`,
      ).toEqual([]);
    }

    const transitions = rules.flatMap((r) =>
      declarations(r.style)
        .filter(([name]) => /^(-webkit-)?transition(-|$)/.test(name))
        .map(([name, value]) => `${r.selector} { ${name}: ${value} }`),
    );
    expect(transitions).toEqual([]);

    // Nor does anything outside CSS: no script, no SVG animation.
    expect(page.querySelectorAll("script, animate, animateMotion, animateTransform, set")).toHaveLength(0);
  });

  it("AC3 (d) inside @media (prefers-reduced-motion: reduce) an !important rule stops the sweep", () => {
    const bar = scanBar();
    const stops = rules.filter(
      (r) =>
        r.media.length === 1 &&
        r.media[0] === "(prefers-reduced-motion:reduce)" &&
        matches(r, bar) &&
        declarations(r.style).some(
          ([name, value, important]) =>
            (name === "animation" || name === "animation-name") && value === "none" && important,
        ),
    );
    expect(stops.length).toBeGreaterThan(0);
  });
});

describe("AC4: the two share one grid cell at 72%, the warning held left, the popover right, lower and in front", () => {
  it("AC4 (a) .shots is a grid", () => {
    expect(declared(shots(), "display")).toContain("grid");
  });

  /** One grid cell, at 72% of its width, in the flow and shown. */
  const expectInTheCell = (el: Element) => {
    expect(declared(el, "grid-area")).toContain("1/1");
    expect(declared(el, "width")).toContain("72%");

    const positioned = declared(el, "position", rules).filter((v) => v === "absolute" || v === "fixed");
    expect(positioned).toEqual([]);
    const pixels = ["width", "min-width", "inline-size", "min-inline-size"].flatMap((property) =>
      declared(el, property, rules)
        .filter((v) => (v.match(/[\d.]+px/g) ?? []).some((px) => parseFloat(px) !== 0))
        .map((v) => `${property}: ${v}`),
    );
    expect(pixels).toEqual([]);

    expect(hiding(el)).toEqual([]);
  };

  it("AC4 (b) the warning image takes the one cell, at 72% of its width, in the flow and shown", () => {
    expectInTheCell(warningImage());
  });

  it("AC4 (b) the popover takes the one cell, at 72% of its width, in the flow and shown", () => {
    expectInTheCell(popover());
  });

  it("AC4 (c) the warning image is held left and tilted -3deg, at the top of the cell", () => {
    const el = warningImage();
    expect(declared(el, "justify-self")).toContain("start");
    expect(declared(el, "transform")).toContain("rotate(-3deg)");
    const lowered = [
      ...declared(el, "margin-top", rules),
      ...declared(el, "margin-block-start", rules),
      ...["margin-block", "margin"].flatMap((p) => declared(el, p, rules).map((v) => v.split(" ")[0])),
    ].filter((v) => !isZero(v));
    expect(lowered).toEqual([]);
  });

  it("AC4 (c) the popover is held right, 22% lower, tilted 4deg, and clips its content", () => {
    const el = popover();
    expect(declared(el, "justify-self")).toContain("end");
    expect(declared(el, "margin-top")).toContain("22%");
    expect(declared(el, "transform")).toContain("rotate(4deg)");
    expect(declared(el, "overflow")).toContain("hidden");
  });
});
