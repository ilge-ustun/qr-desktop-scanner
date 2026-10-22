// Story 013: each card's frame and action row, as the DOM the keycap rules
// (styles.css: .keyed > button, .body > .card, :has()) and useCardKeys
// (data-card-keys) select on. The literals were read from epic/quality before
// the cards shared one frame, one copy feedback and one keyed button. jsdom
// evaluates none of that CSS: this holds the DOM it depends on, not the look.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { M1 } from "./contactCodes";

type ScanHandlers = { started: (scope: string) => void; result: (outcome: unknown) => void };
let scan: ScanHandlers = { started: () => {}, result: () => {} };
const ipc = vi.hoisted(() => ({
  startScan: vi.fn(() => Promise.resolve()),
  screenPermission: vi.fn(() => Promise.resolve(true)),
  onScan: vi.fn((handlers: ScanHandlers) => {
    scan = handlers;
    return Promise.resolve(() => {});
  }),
  fitPopover: vi.fn(() => Promise.resolve()),
  hidePopover: vi.fn(() => Promise.resolve()),
  openScreenSettings: vi.fn(() => Promise.resolve()),
  copyText: vi.fn<(text: string) => Promise<void>>(() => Promise.resolve()),
  openLink: vi.fn<(url: string) => Promise<void>>(() => Promise.resolve()),
  joinWifi: vi.fn<(ssid: string, password: string) => Promise<void>>(() => Promise.resolve()),
  getHotkey: vi.fn(() => Promise.resolve("shift+super+Digit2")),
  suspendHotkey: vi.fn(() => Promise.resolve()),
  resumeHotkey: vi.fn(() => Promise.resolve()),
  setHotkey: vi.fn((a: string) => Promise.resolve(a)),
}));
vi.mock("../lib/ipc", () => ipc);

import { App } from "../App";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/** The attributes an outline line names with their values, in this order. */
const VALUED = ["type", "aria-label", "aria-keyshortcuts", "aria-hidden", "data-card-keys", "disabled"];
/** The attributes it names without: useId values are not stable. */
const PRESENT = ["id", "aria-describedby"];

/** One element: tag, classes, attributes, and the text of a label, headline,
 * button or keycap. */
function line(el: Element): string {
  let out = el.tagName.toLowerCase() + Array.from(el.classList, (c) => `.${c}`).join("");
  for (const name of VALUED) if (el.hasAttribute(name)) out += `[${name}=${el.getAttribute(name)}]`;
  for (const name of PRESENT) if (el.hasAttribute(name)) out += `[${name}]`;
  if (el.matches(".meta, .headline, button, kbd")) out += ` ${JSON.stringify(el.textContent)}`;
  return out;
}

/** The card, its children, its header's, its titles', its action row's and
 * its keyed buttons', one line each, in document order. */
function outline(card: Element): string[] {
  const shown = new Set<Element>([card, ...card.children]);
  const childrenOf = (selector: string) => {
    for (const parent of card.querySelectorAll(selector)) for (const child of parent.children) shown.add(child);
  };
  childrenOf(":scope > header");
  childrenOf(".titles");
  childrenOf(".actions");
  childrenOf(".actions .keyed");
  return [card, ...card.querySelectorAll("*")].filter((el) => shown.has(el)).map(line);
}

/** The one card App shows. */
function theCard(): Element {
  const cards = document.querySelectorAll(".body > .card");
  expect(cards).toHaveLength(1);
  return cards[0];
}

async function start() {
  render(<App />);
  await vi.waitFor(() => expect(ipc.onScan).toHaveBeenCalled());
}

const found = (text: string) => async () => {
  await start();
  act(() => scan.result({ kind: "found", codes: [{ text, format: "qrcode" }] }));
};

/** A Wi-Fi card after Connect, while joinWifi has not answered. */
const connecting = (text: string) => async () => {
  await found(text)();
  ipc.joinWifi.mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Connect" })));
};

/** Nothing found, after a drag scan. */
async function notFound() {
  await start();
  act(() => scan.started("area"));
  act(() => scan.result({ kind: "notFound" }));
}

/** Scan failed, with the message Rust sends. */
async function failed() {
  await start();
  act(() => scan.result({ kind: "error", message: "Screen capture failed" }));
}

type Row = { name: string; show: () => Promise<void>; outline: string[] };

const KEYED_COPY = (label: string) => [
  "span.keyed",
  `button.ghost[type=button][aria-keyshortcuts=Enter] "${label}"`,
  'kbd.keycap[aria-hidden=true] "↩"',
];

const ROWS: Row[] = [
  {
    name: "link https://example.com/menu",
    show: found("https://example.com/menu"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Link"',
      'span.headline.size-l "example.com"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.content",
      "div.actions",
      ...KEYED_COPY("Copy"),
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+O] "Open"',
      'kbd.keycap[aria-hidden=true] "⌘O"',
    ],
  },
  {
    name: "warned link http://bit.ly/3xQ9kLm",
    show: found("http://bit.ly/3xQ9kLm"),
    outline: [
      "article.card.tone-warn[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Link · check before opening"',
      'span.headline.size-l "bit.ly"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.content",
      "ul.warnings",
      "div.actions",
      ...KEYED_COPY("Copy"),
      'button.risky[type=button] "Open anyway"',
    ],
  },
  {
    name: "javascript:alert('QR test')",
    show: found("javascript:alert('QR test')"),
    outline: [
      "article.card.tone-danger[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Link · check before opening"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.content",
      "ul.warnings",
      "div.actions",
      ...KEYED_COPY("Copy"),
    ],
  },
  {
    name: "email mailto:jane@example.com",
    show: found("mailto:jane@example.com"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Email"',
      'span.headline.size-m "jane@example.com"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.content",
      "div.actions",
      ...KEYED_COPY("Copy"),
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+O] "Open"',
      'kbd.keycap[aria-hidden=true] "⌘O"',
    ],
  },
  {
    name: "text Table 12 · order at the bar",
    show: found("Table 12 · order at the bar"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Text"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.content",
      "div.actions",
      ...KEYED_COPY("Copy"),
    ],
  },
  {
    name: "Wi-Fi WIFI:T:WPA;S:Home;P:secret;;",
    show: found("WIFI:T:WPA;S:Home;P:secret;;"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Wi-Fi · WPA/WPA2"',
      'span.headline.size-l "Home"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "div.secret",
      "div.actions",
      ...KEYED_COPY("Copy password"),
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+J] "Connect"',
      'kbd.keycap[aria-hidden=true] "⌘J"',
    ],
  },
  {
    name: "open Wi-Fi WIFI:T:nopass;S:Guest;;",
    show: found("WIFI:T:nopass;S:Guest;;"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Wi-Fi · open network"',
      'span.headline.size-l "Guest"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "div.actions",
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+J] "Connect"',
      'kbd.keycap[aria-hidden=true] "⌘J"',
    ],
  },
  {
    name: "Wi-Fi WIFI:T:WPA;S:Home;P:secret;; while it connects",
    show: connecting("WIFI:T:WPA;S:Home;P:secret;;"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Wi-Fi · WPA/WPA2"',
      'span.headline.size-l "Home"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "div.secret",
      "div.actions",
      ...KEYED_COPY("Copy password"),
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+J][disabled=] "Connecting…"',
      'kbd.keycap[aria-hidden=true] "⌘J"',
    ],
  },
  {
    name: "contact M1",
    show: found(M1),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Contact"',
      'span.headline.size-l[id] "Jane Doe"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "ul.fields",
      "div.actions",
      "span.keyed",
      'button.ghost[type=button][aria-keyshortcuts=Enter][aria-describedby] "Copy name"',
      'kbd.keycap[aria-hidden=true] "↩"',
    ],
  },
  {
    name: "phone tel:+31201234567",
    show: found("tel:+31201234567"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Phone"',
      'span.headline.size-l[id] "+31201234567"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "div.actions",
      "span.keyed",
      'button.ghost[type=button][aria-keyshortcuts=Enter][aria-describedby] "Copy number"',
      'kbd.keycap[aria-hidden=true] "↩"',
    ],
  },
  {
    name: "SMS sms:+31201234567?body=…",
    show: found("sms:+31201234567?body=Running%20late%3A%2010%20min"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "SMS"',
      'span.headline.size-l[id] "+31201234567"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "ul.fields",
      "div.actions",
      "span.keyed",
      'button.ghost[type=button][aria-keyshortcuts=Enter][aria-describedby] "Copy number"',
      'kbd.keycap[aria-hidden=true] "↩"',
    ],
  },
  {
    name: "location geo:-33.8568,151.2153?q=Opera%20House",
    show: found("geo:-33.8568,151.2153?q=Opera%20House"),
    outline: [
      "article.card.tone-ok[data-card-keys=]",
      "header.card-head",
      "div.titles",
      'span.meta "Location"',
      'span.headline.size-l[id] "Opera House"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "ul.fields",
      "div.actions",
      "span.keyed",
      'button.ghost[type=button][aria-keyshortcuts=Enter][aria-describedby] "Copy place"',
      'kbd.keycap[aria-hidden=true] "↩"',
      "span.keyed",
      'button.primary[type=button][aria-keyshortcuts=Meta+O] "Open in Maps"',
      'kbd.keycap[aria-hidden=true] "⌘O"',
    ],
  },
  {
    name: "Nothing found",
    show: notFound,
    outline: [
      "div.card.tone-warn",
      "header.card-head",
      'span.meta "Nothing found"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.notice",
    ],
  },
  {
    name: "Scan failed",
    show: failed,
    outline: [
      "div.card.tone-danger",
      "header.card-head",
      'span.meta "Scan failed"',
      'button.dismiss[type=button][aria-label=Dismiss] ""',
      "p.failure",
    ],
  },
];

for (const row of ROWS) {
  it(`AC5: the ${row.name} card renders its frame and action row as before`, async () => {
    await row.show();
    expect(outline(theCard())).toEqual(row.outline);
  });
}
