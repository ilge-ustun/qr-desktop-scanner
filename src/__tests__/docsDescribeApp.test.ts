// README.md and the project page (site/index.html) describe the app as it is:
// the new cards, the keys, Find all on screen and the decoy-domain warning.
// These tests read both files as text. They prove that named words and
// structures are in named places, not that the sentences are true: a person
// reads them against the app. jsdom does no layout, and the font checks read
// what the page's rules declare, not which face draws a glyph.
import { describe, expect, it } from "vitest";

import readme from "../../README.md?raw";
import html from "../../site/index.html?raw";
import { assess } from "../lib/urlSafety";

const page = new DOMParser().parseFromString(html, "text/html");

/** One space for each run of whitespace, none at the ends. */
function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The node's text, its whitespace collapsed. */
function textOf(node: Node): string {
  return collapse(node.textContent ?? "");
}

const WORD = "[\\p{L}\\p{N}_-]";

/** True when the word stands on its own: no letter, digit, _ or - on either side. */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!${WORD})${escaped}(?!${WORD})`, "iu").test(text);
}

function decoyDomain(url: string): string | null {
  const a = assess(url);
  return a.warnings.some((w) => w.code === "decoy-domain") ? a.domain : null;
}

// ---------------------------------------------------------------- the page

function steps(): Element[] {
  const lists = page.querySelectorAll("ol.steps");
  expect(lists).toHaveLength(1);
  const items = Array.from(lists[0].children).filter((el) => el.localName === "li");
  expect(items).toHaveLength(3);
  return items;
}

describe("AC1: step 3 names the kinds, the keys and Open anyway; step 1 or 2 names Find all on screen", () => {
  it("AC1 (a) step 3 names link, text, Wi-Fi, contact, phone, SMS and location, each as a word", () => {
    const text = textOf(steps()[2]).toLowerCase();
    const missing = ["link", "text", "wi-fi", "contact", "phone", "sms", "location"].filter((w) => !hasWord(text, w));
    expect(missing, text).toEqual([]);
  });

  it("AC1 (b) step 3 names a key and a click, and that a warned link opens only from Open anyway", () => {
    const text = textOf(steps()[2]);
    expect(hasWord(text, "key") || /[⌘↩]/.test(text), text).toBe(true);
    expect(text.toLowerCase()).toContain("click");
    expect(text).toContain("Open anyway");
  });

  it("AC1 (c) the page no longer says nothing happens until you click", () => {
    const text = textOf(page.documentElement);
    expect(text.includes("Nothing happens until you click."), "the page still says it").toBe(false);
  });

  it("AC1 (d) step 1 or step 2 names Find all on screen", () => {
    const [first, second] = steps().map((li) => textOf(li).toLowerCase());
    expect([first, second].some((t) => t.includes("find all on screen")), `${first} | ${second}`).toBe(true);
  });
});

// The four items of the checks list as they were, their whitespace collapsed.
const CHECKS_KEPT = [
  '<span class="mark">Fake destinations</span>: <code>paypal.com@evil.example</code> really goes to evil.example.',
  '<span class="mark">Look-alike letters</span> in the address, like a Cyrillic а in apple.',
  '<span class="mark">Unencrypted links</span>, bare IP addresses and link shorteners.',
  "<span class=\"mark\">Script and file links</span> that can't be opened at all.",
];

function checks(): Element[] {
  const headings = Array.from(page.querySelectorAll("h2")).filter(
    (h) => textOf(h) === "Checks the link before you do",
  );
  expect(headings).toHaveLength(1);
  const section = headings[0].closest("section");
  expect(section).not.toBeNull();
  const lists = (section as Element).querySelectorAll("ul");
  expect(lists).toHaveLength(1);
  const items = Array.from(lists[0].querySelectorAll("li"));
  expect(items.length).toBeGreaterThan(0);
  return items;
}

/** True when the name appears in the element's text, outside `inside`, as a
 * whole name: no letter, digit, - or . before it, and no letter, digit or -
 * (nor a dot that goes on with one) after it. */
function namesOutside(el: Element, inside: Element, name: string): boolean {
  let full = "";
  const skipped: [number, number][] = [];
  const walker = page.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (inside.contains(node)) skipped.push([full.length, full.length + text.length]);
    full += text;
  }
  full = full.toLowerCase();
  const target = name.toLowerCase();
  for (let at = full.indexOf(target); at >= 0; at = full.indexOf(target, at + 1)) {
    const end = at + target.length;
    if (skipped.some(([from, to]) => at < to && end > from)) continue;
    const before = full[at - 1] ?? "";
    const after = full[end] ?? "";
    if (/[\p{L}\p{N}.-]/u.test(before)) continue;
    if (/[\p{L}\p{N}-]/u.test(after)) continue;
    if (after === "." && /[\p{L}\p{N}-]/u.test(full[end + 1] ?? "")) continue;
    return true;
  }
  return false;
}

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/** Why the item is not a decoy-domain check in the Fake destinations pattern, or null when it is. */
function notADecoyItem(li: Element): string | null {
  const first = li.firstElementChild;
  if (!first || first.localName !== "span" || !first.classList.contains("mark") || textOf(first) === "") {
    return `does not start with a labelled span.mark: ${li.innerHTML}`;
  }
  const codes = li.querySelectorAll("code");
  if (codes.length !== 1) return `has ${codes.length} <code>, not one: ${li.innerHTML}`;
  const host = textOf(codes[0]);
  if (!HOST.test(host)) return `the example is not a bare host name: ${host}`;
  const domain = decoyDomain(`https://${host}`);
  if (!domain) return `the app does not flag ${host} as a decoy domain`;
  if (!namesOutside(li, codes[0], domain)) return `does not name ${domain}, which the app says ${host} belongs to`;
  return null;
}

describe("AC2: the checks list keeps its four items and adds a decoy-domain one the app flags", () => {
  it("AC2 (a) the four items there now are still there, word for word", () => {
    const items = checks().map((li) => collapse(li.innerHTML));
    for (const kept of CHECKS_KEPT) expect(items).toContain(kept);
  });

  it("AC2 (b) one more item labels a decoy host the app flags, in <code>, and names the domain it belongs to", () => {
    const others = checks().filter((li) => !CHECKS_KEPT.includes(collapse(li.innerHTML)));
    expect(others.map(notADecoyItem)).toContain(null);
  });
});

type Rule = { selector: string; style: CSSStyleDeclaration };

// A DOMParser document has no window, so jsdom builds no sheet for its
// <style>. The text is copied into a <style> of the test's own document.
function readRules(): Rule[] {
  const styles = page.querySelectorAll("style");
  expect(styles.length).toBeGreaterThan(0);
  const rules: Rule[] = [];
  const walk = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        if (rule.cssRules?.length) throw new Error(`nested rules are not read: ${rule.selectorText}`);
        rules.push({ selector: rule.selectorText, style: rule.style });
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules);
      }
    }
  };
  for (const style of Array.from(styles)) {
    const el = document.createElement("style");
    el.textContent = style.textContent;
    document.head.append(el);
    walk((el.sheet as CSSStyleSheet).cssRules);
  }
  expect(rules.length).toBeGreaterThan(0);
  return rules;
}

/** Splits at each top-level comma, never inside ( ) or [ ]. */
function selectorParts(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

// A part with a pseudo-element never matches the element itself.
const PSEUDO_ELEMENT = /::|:(?:before|after|first-line|first-letter)(?![\w-])/i;

const FONT_PROPERTIES = ["font", "font-family"];

/** Elements the browser's own stylesheet gives a font. */
const UA_FONT = new Set(["kbd", "code", "samp", "pre", "tt", "button", "input", "select", "textarea"]);

/** The font and font-family values the page declares on the element: in its rules, then its style attribute. */
function fontsOn(el: Element, rules: Rule[]): string[] {
  const values: string[] = [];
  for (const rule of rules) {
    if (!selectorParts(rule.selector).some((part) => !PSEUDO_ELEMENT.test(part) && el.matches(part))) continue;
    for (const property of FONT_PROPERTIES) {
      const value = rule.style.getPropertyValue(property);
      if (value !== "") values.push(`${rule.selector} { ${property}: ${value} }`);
    }
  }
  const inline = el.getAttribute("style");
  if (inline !== null) {
    const probe = document.createElement("span");
    probe.setAttribute("style", inline);
    for (const property of FONT_PROPERTIES) {
      const value = probe.style.getPropertyValue(property);
      if (value !== "") values.push(`style="${property}: ${value}"`);
    }
  }
  return values;
}

const KEY_GLYPH = /[⌘⇧⌥⌃↩]/;
const MONO = /var\(\s*--mono\s*\)|sometype mono/i;
const PIXEL = /var\(\s*--pixel\s*\)|silkscreen/i;

describe("AC3: the page names ↩ or Enter, ⌘O and ⌘J, and sets key glyphs in the mono face", () => {
  function blocks(): string[] {
    const mains = page.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    const found = Array.from(mains[0].querySelectorAll("li, p")).map(textOf);
    expect(found.length).toBeGreaterThan(0);
    return found;
  }

  it("AC3 (a) an item or paragraph in <main> says ⌘O opens", () => {
    expect(blocks().some((t) => t.includes("⌘O") && t.toLowerCase().includes("open"))).toBe(true);
  });

  it("AC3 (a) an item or paragraph in <main> says ⌘J joins or connects", () => {
    expect(
      blocks().some((t) => t.includes("⌘J") && (t.toLowerCase().includes("join") || t.toLowerCase().includes("connect"))),
    ).toBe(true);
  });

  it("AC3 (a) an item or paragraph in <main> says ↩ or Enter copies", () => {
    expect(
      blocks().some(
        (t) => (t.includes("↩") || hasWord(t, "Enter")) && (t.toLowerCase().includes("copy") || t.toLowerCase().includes("copies")),
      ),
    ).toBe(true);
  });

  it("AC3 (b) every key glyph in <body> is set in the mono face by the first element that sets a font", () => {
    const rules = readRules();
    const glyphs: Text[] = [];
    const walker = page.createTreeWalker(page.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (KEY_GLYPH.test(node.textContent ?? "")) glyphs.push(node as Text);
    }
    expect(glyphs.length).toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const glyph of glyphs) {
      const where = `"${textOf(glyph)}"`;
      let at: Element | null = glyph.parentElement;
      let fonts: string[] = [];
      for (; at; at = at.parentElement) {
        fonts = fontsOn(at, rules);
        if (fonts.length > 0 || UA_FONT.has(at.localName)) break;
      }
      if (!at) {
        wrong.push(`${where}: nothing sets its font`);
      } else if (fonts.length === 0) {
        wrong.push(`${where}: <${at.localName}> takes the browser's font, the page sets none`);
      } else {
        const bad = fonts.filter((f) => !MONO.test(f) || PIXEL.test(f));
        if (bad.length > 0) wrong.push(`${where} at <${at.localName} class="${at.className}">: ${bad.join("; ")}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

// ---------------------------------------------------------------- the README

const lines = readme.split(/\r?\n/);

/** From the heading line to the next heading line named, that one excluded. */
function section(from: string, to: string): string {
  const start = lines.findIndex((l) => l.trimEnd() === from);
  expect(start, `no "${from}"`).toBeGreaterThanOrEqual(0);
  const end = lines.findIndex((l, i) => i > start && l.trimEnd() === to);
  expect(end, `no "${to}" after "${from}"`).toBeGreaterThan(start);
  return lines.slice(start, end).join("\n");
}

/** The numbered items of a Markdown list, numbers dropped, whitespace collapsed. */
function numberedItems(markdown: string): string[] {
  const items: string[] = [];
  let open = false;
  for (const line of markdown.split("\n")) {
    const item = /^\d+\.\s+(.*)$/.exec(line);
    if (item) {
      items.push(item[1]);
      open = true;
    } else if (open && /^\s+\S/.test(line)) {
      items[items.length - 1] += ` ${line}`;
    } else {
      open = false;
    }
  }
  return items.map(collapse);
}

/** The bullet that starts with the given text, up to the next bullet or a line that is not part of it. */
function bullet(markdown: string, start: string): string {
  const all = markdown.split("\n");
  const at = all.findIndex((l) => l.startsWith(`- ${start}`));
  expect(at, `no bullet starting "${start}"`).toBeGreaterThanOrEqual(0);
  let end = at + 1;
  while (end < all.length && /^\s+\S/.test(all[end])) end++;
  return collapse(all.slice(at, end).join(" "));
}

// The ten items of "What to check" as they were.
const CHECKS_TO_KEEP = [
  "The popover opens at launch; no Dock icon; clicking elsewhere closes it.",
  "Without the permission: the popover explains it, and *Open System Settings* goes to the right pane.",
  "Scan a code in Preview (image), a PDF, a paused video, a web page.",
  "Esc during the selection cancels quietly.",
  'A box with no code says "No QR code found"; two codes give two cards.',
  "Copy puts the exact text on the clipboard; Open launches the browser.",
  "A `javascript:` code shows a warning and no Open button.",
  "A Wi-Fi code shows the network name, the password hidden behind Show, and Connect joins it (System Settings → Wi-Fi shows it connected).",
  "The popover is only as tall as its content.",
  "⌘⇧2 works while another app is in front. Click the ⇧⌘2 chip in the popover, press another combination (with ⌘, ⌃ or ⌥) and that one works instead, also after a restart; Esc while recording keeps the old one.",
];

describe("AC4: README's What to check adds Find all, the new cards, the keys and the decoy warning", () => {
  const whatToCheck = () => section("### What to check", "## How it works");

  it("AC4 (a) the ten checks there now are still there, word for word", () => {
    const items = numberedItems(whatToCheck());
    for (const kept of CHECKS_TO_KEEP) expect(items).toContain(kept);
  });

  it("AC4 (b) names Find all on screen, the new cards, Open in Maps, the keys and Open anyway", () => {
    const text = whatToCheck().toLowerCase();
    expect(text).toContain("find all on screen");
    expect(text.includes("vcard") || text.includes("mecard"), "vcard or mecard").toBe(true);
    for (const words of ["tel:", "sms", "geo:", "open in maps", "⌘o", "⌘j", "open anyway"]) expect(text).toContain(words);
    expect(text.includes("↩") || text.includes("enter"), "↩ or enter").toBe(true);
  });

  it("AC4 (c) a code span holds an address the app flags as a decoy domain", () => {
    const spans = Array.from(whatToCheck().matchAll(/`([^`]+)`/g), (m) => m[1].trim());
    expect(spans.length).toBeGreaterThan(0);
    const decoys = spans.filter((x) => decoyDomain(/^https?:\/\//i.test(x) ? x : `https://${x}`) !== null);
    expect(decoys, spans.join(" | ")).not.toEqual([]);
  });
});

// 004's Find all bullet in "How it works", as it was.
const FIND_ALL_BULLET = [
  "- **Find all on screen** (the button under Scan, or *Find All Codes on",
  "  Screen* in the menu-bar icon's right-click menu) takes no selection:",
  "  `screencapture -x` writes one image per display, and each code found is",
  "  shown once, the main display's first. A small code may still need a box",
  "  around it: only a small selection is also tried enlarged.",
].join("\n");

describe("AC5: README's opening names the new kinds and keys; How it works names the cards, the keys and the decoy check", () => {
  function opening(): string {
    const heading = lines.findIndex((l) => l.trimEnd() === "# QR Scanner");
    expect(heading, 'no "# QR Scanner"').toBeGreaterThanOrEqual(0);
    let start = heading + 1;
    while (start < lines.length && lines[start].trim() === "") start++;
    let end = start;
    while (end < lines.length && lines[end].trim() !== "") end++;
    const paragraph = collapse(lines.slice(start, end).join("\n"));
    expect(paragraph).not.toBe("");
    return paragraph;
  }

  it("AC5 (a) the opening paragraph names contacts, phones, SMS, locations, Wi-Fi and a key", () => {
    const text = opening().toLowerCase();
    for (const word of ["contact", "phone", "sms", "location", "wi-fi", "key"]) expect(text).toContain(word);
  });

  it("AC5 (a) the opening paragraph no longer says nothing happens until you click", () => {
    expect(opening()).not.toContain("Nothing is copied, opened or joined until you click.");
  });

  const howItWorks = () => section("## How it works", "## Look");

  it("AC5 (b) How it works names the contact formats, tel:, SMS, geo: and the keys", () => {
    const text = howItWorks().toLowerCase();
    for (const words of ["vcard", "mecard", "tel:", "sms", "geo:", "⌘o", "⌘j"]) expect(text).toContain(words);
    expect(text.includes("↩") || text.includes("enter"), "↩ or enter").toBe(true);
  });

  it("AC5 (b) the untrusted-content bullet names the decoy check", () => {
    expect(bullet(howItWorks(), "**QR content is untrusted.**").toLowerCase()).toContain("decoy");
  });

  it("AC5 (b) 004's Find all bullet is still there, word for word", () => {
    expect(collapse(howItWorks())).toContain(collapse(FIND_ALL_BULLET));
  });
});

// ---------------------------------------------------------------- kept, and nothing new loaded

// What the human said to keep, copied from site/index.html at epic/docs.
const KEPT = [
  // site/index.html:4-20 at epic/docs (14d505a): the head's meta and link tags, Open Graph and Twitter included.
  `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR Scanner for Mac</title>
<meta name="description" content="A small menu-bar app for Mac that reads any QR code on your screen and shows exactly what it says before anything opens. Free and open source.">
<link rel="canonical" href="https://ilge-ustun.github.io/qr-desktop-scanner/">
<link rel="icon" type="image/png" href="img/favicon.png">
<link rel="apple-touch-icon" href="img/apple-touch-icon.png">

<meta property="og:type" content="website">
<meta property="og:url" content="https://ilge-ustun.github.io/qr-desktop-scanner/">
<meta property="og:title" content="QR Scanner for Mac">
<meta property="og:description" content="Press ⇧⌘2, drag a box around any QR code on your screen, and see exactly what it says before anything opens. Free and open source.">
<meta property="og:image" content="https://ilge-ustun.github.io/qr-desktop-scanner/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="QR Scanner: read any QR code on your screen">
<meta name="twitter:card" content="summary_large_image">`,
  // site/index.html:170-199 at epic/docs (14d505a): the hero, with the fine line.
  `  <section class="wrap hero">
    <div class="pitch">
      <img class="icon" src="img/icon.png" width="104" height="104" alt="QR Scanner app icon">
      <h1>Read any QR code on your screen</h1>
      <p class="lede">A small menu-bar app for Mac. Press ⇧⌘2, drag a box around a code in a photo, a PDF, a paused video or a web page, and see exactly what it says before anything opens.</p>
      <div class="ctas">
        <a class="button primary" href="https://github.com/ilge-ustun/qr-desktop-scanner/releases/latest">Download for Mac</a>
        <a class="button" href="https://github.com/ilge-ustun/qr-desktop-scanner">Source on GitHub</a>
      </div>
      <span class="fine">One DMG for Apple Silicon and Intel · macOS 12 or later · free and open source</span>
    </div>
    <div class="shots">
      <img src="img/warning.png" width="360" height="363" alt="A scanned link with two warnings: not encrypted, and a link shortener">
      <div class="popover" role="img" aria-label="The QR Scanner popover, ready to scan">
        <div class="head" aria-hidden="true">
          <span class="title">QR Scanner</span>
          <span class="chip">⇧⌘2</span>
        </div>
        <div class="body" aria-hidden="true">
          <div class="viewfinder">
            <span class="corners"><span class="c-tl"></span><span class="c-tr"></span><span class="c-bl"></span><span class="c-br"></span></span>
            <span class="scanline"></span>
            <span class="prompt">Drag a box around&#10;any code on screen</span>
          </div>
          <span class="scan">Scan</span>
          <p class="hint">Photo, PDF, paused video, web page. Esc cancels.</p>
        </div>
      </div>
    </div>
  </section>`,
  // site/index.html:229-233 at epic/docs (14d505a): the facts.
  `  <section class="wrap facts" aria-label="At a glance">
    <div><span class="pixel">Private</span><span>No network access, no account, no analytics. The screenshot is deleted as soon as it's read.</span></div>
    <div><span class="pixel">Open source</span><span>Rust and React on Tauri. Read the code, build it yourself, or check how a release was made.</span></div>
    <div><span class="pixel">Small</span><span>About 8 MB. Lives in the menu bar, no Dock icon, no window until you need it.</span></div>
  </section>`,
  // site/index.html:235-248 at epic/docs (14d505a): first launch.
  `  <section id="first-launch" class="wrap first">
    <div class="sheet">
      <span class="label">▲ About the first launch</span>
      <h2>macOS will warn you once</h2>
      <p>QR Scanner isn't signed with an Apple Developer ID yet, as this is a free side project. So the first time you open it, macOS says it "could not verify" the app. To open it anyway:</p>
      <ol>
        <li>Drag QR Scanner from the DMG to Applications, and open it. Click <b>Done</b> on the warning.</li>
        <li>Open System Settings → Privacy &amp; Security, scroll down and click <b>Open Anyway</b>.</li>
        <li>Enter your Mac password, then click <b>Open</b>. It opens normally from then on.</li>
      </ol>
      <p>On the first scan it asks for Screen Recording permission. It needs it to read the box you drag, and it never records anything else.</p>
      <p class="verify">Want to check the download first? Every release lists its SHA-256 and a build attestation from GitHub: <code>gh attestation verify QR-Scanner-*.dmg -R ilge-ustun/qr-desktop-scanner</code></p>
    </div>
  </section>`,
  // site/index.html:251-256 at epic/docs (14d505a): the footer.
  `<footer>
  <div class="wrap">
    <span>Made by ilge ustun | MIT licence</span>
    <a href="https://github.com/ilge-ustun/qr-desktop-scanner">github.com/ilge-ustun/qr-desktop-scanner</a>
  </div>
</footer>`,
];

/** The argument of each url( in the CSS, read past quoted strings and comments,
 * so a url( inside a data: URL is part of that URL, not one of its own. */
function cssUrls(css: string): string[] {
  const urls: string[] = [];
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
    } else if (css[i] === '"' || css[i] === "'") {
      const end = css.indexOf(css[i], i + 1);
      i = end < 0 ? css.length : end + 1;
    } else if (/^url\(/i.test(css.slice(i, i + 4))) {
      let j = i + 4;
      while (/\s/.test(css[j] ?? "")) j++;
      let value: string;
      if (css[j] === '"' || css[j] === "'") {
        const end = css.indexOf(css[j], j + 1);
        value = css.slice(j + 1, end < 0 ? css.length : end);
        j = end < 0 ? css.length : end + 1;
      } else {
        const end = css.indexOf(")", j);
        value = css.slice(j, end < 0 ? css.length : end).trim();
        j = end < 0 ? css.length : end;
      }
      urls.push(value);
      i = j;
    } else {
      i++;
    }
  }
  return urls;
}

describe("AC6: the head, hero, facts, first launch and footer are kept, no version, nothing new loaded", () => {
  it("AC6 (a) the head's tags, the hero, the facts, first launch and the footer are kept character for character", () => {
    for (const block of KEPT) expect(html).toContain(block);
  });

  it("AC6 (b) the body names no version number", () => {
    const text = textOf(page.body);
    expect(text).not.toBe("");
    expect(text.match(/\bv?\d+\.\d+\.\d+\b/g)).toBeNull();
  });

  it("AC6 (c) only the three images load from the body, and the head links only the base's three", () => {
    const sourced = Array.from(page.querySelectorAll("[src], [srcset]"));
    expect(sourced.map((el) => el.localName)).toEqual(["img", "img", "img"]);
    expect(sourced.map((el) => el.getAttribute("src")).sort()).toEqual([
      "img/icon.png",
      "img/warning.png",
      "img/wifi.png",
    ]);
    expect(sourced.filter((el) => el.hasAttribute("srcset"))).toEqual([]);
    expect(page.querySelectorAll("object, base")).toHaveLength(0);

    expect(Array.from(page.querySelectorAll("link"), (l) => l.outerHTML)).toEqual([
      '<link rel="canonical" href="https://ilge-ustun.github.io/qr-desktop-scanner/">',
      '<link rel="icon" type="image/png" href="img/favicon.png">',
      '<link rel="apple-touch-icon" href="img/apple-touch-icon.png">',
    ]);
  });

  it("AC6 (c) the styles load only the bundled fonts and data: URLs, and import nothing", () => {
    const styles = Array.from(page.querySelectorAll("style"), (s) => s.textContent ?? "");
    expect(styles.length).toBeGreaterThan(0);
    const css = [...styles, ...Array.from(page.querySelectorAll("[style]"), (el) => el.getAttribute("style") ?? "")].join(
      "\n",
    );
    const urls = cssUrls(css);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u) => !/^fonts\//.test(u) && !/^data:/i.test(u))).toEqual([]);
    expect(css.toLowerCase()).not.toContain("@import");
  });
});
