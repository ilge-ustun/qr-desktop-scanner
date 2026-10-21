// Story 005: the result cards answer the keyboard. Enter copies, ⌘O opens a
// safe link, ⌘J connects; each key goes through the card's own button.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { M1 } from "./contactCodes";

type ScanHandlers = { started: () => void; result: (outcome: unknown) => void };
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

const LINK = "https://example.com/menu"; // tone ok: Open
const MAIL = "mailto:jane@example.com"; // tone ok: Open
const WARNED = "http://bit.ly/3xQ9kLm"; // caution (http, shortener): Open anyway
const SCRIPT = "javascript:alert('QR test')"; // danger, no Open at all
const TEXT = "Table 12 · order at the bar"; // text card, no Open
const WIFI = "WIFI:T:WPA;S:Home;P:secret;;";
const OPEN_WIFI = "WIFI:T:nopass;S:Guest;;"; // no password, no Copy password
const CONTACT = M1;
const PHONE = "tel:+31201234567";
const SMS = "sms:+31201234567?body=Running%20late%3A%2010%20min";
const PLACE = "geo:-33.8568,151.2153?q=Opera%20House"; // headline: Opera House
const BAD_GEO = "geo:90.0001,0"; // no Open in Maps

const ENTER = { key: "Enter", code: "Enter" };
const CMD_O = { key: "o", code: "KeyO", metaKey: true };
const CMD_J = { key: "j", code: "KeyJ", metaKey: true };
const ESC = { key: "Escape", code: "Escape" };

type Init = Record<string, unknown>;

/** Renders App, waits for its scan listener, and shows nothing yet. */
async function start(app = <App />) {
  const view = render(app);
  await vi.waitFor(() => expect(ipc.onScan).toHaveBeenCalled());
  return view;
}

/** Shows a result card for each code, in order. */
const found = (...codes: string[]) =>
  act(() => scan.result({ kind: "found", codes: codes.map((text) => ({ text, format: "qrcode" })) }));

async function show(...codes: string[]) {
  const view = await start();
  found(...codes);
  return view;
}

/** A key press, sent where a browser sends it: to the focused element. */
const press = (init: Init) => fireEvent.keyDown(document.activeElement ?? document.body, init);

/** The calls to copyText, openLink and joinWifi, once pending promises have
 * settled. */
async function calls() {
  await act(async () => {});
  return [
    ...ipc.copyText.mock.calls.map((args) => ["copyText", ...args]),
    ...ipc.openLink.mock.calls.map((args) => ["openLink", ...args]),
    ...ipc.joinWifi.mock.calls.map((args) => ["joinWifi", ...args]),
  ];
}

/** The card that shows `text` (its content or its headline). */
const cardOf = (text: string) => {
  const card = screen.getByText(text).closest<HTMLElement>(".card");
  expect(card, text).not.toBeNull();
  return card!;
};

const button = (name: string, card?: HTMLElement) =>
  (card ? within(card) : screen).getByRole("button", { name });

const nowhere = () => expect(document.activeElement).toBe(document.body);

// AC1: one card, focus nowhere, one key.

const MAPS = "https://maps.apple.com/?ll=-33.8568,151.2153";
const FOCUS_OPEN_ANYWAY = "focus Open anyway";

type Row = {
  name: string;
  code: string;
  /** What Enter copies, and the name of the button that then reads Copied. */
  copy?: [value: string, button: string];
  /** What ⌘O opens, or that it only moves focus to Open anyway. */
  open?: string;
  join?: [ssid: string, password: string];
};

const AC1: Row[] = [
  { name: "LINK", code: LINK, copy: [LINK, "Copy"], open: LINK },
  { name: "MAIL", code: MAIL, copy: [MAIL, "Copy"], open: MAIL },
  { name: "WARNED", code: WARNED, copy: [WARNED, "Copy"], open: FOCUS_OPEN_ANYWAY },
  { name: "SCRIPT", code: SCRIPT, copy: [SCRIPT, "Copy"] },
  { name: "TEXT", code: TEXT, copy: [TEXT, "Copy"] },
  { name: "WIFI", code: WIFI, copy: ["secret", "Copy password"], join: ["Home", "secret"] },
  { name: "OPEN_WIFI", code: OPEN_WIFI, join: ["Guest", ""] },
  { name: "CONTACT", code: CONTACT, copy: ["Jane Doe", "Copy name"] },
  { name: "PHONE", code: PHONE, copy: ["+31201234567", "Copy number"] },
  { name: "SMS", code: SMS, copy: ["+31201234567", "Copy number"] },
  { name: "PLACE", code: PLACE, copy: ["Opera House", "Copy place"], open: MAPS },
  { name: "BAD_GEO", code: BAD_GEO, copy: ["90.0001,0", "Copy coordinates"] },
];

for (const { name, code, copy, open, join } of AC1) {
  it(`005 AC1: ${name}, Enter ${copy ? `copies ${copy[0]} with ${copy[1]}, which then reads Copied` : "copies nothing"}`, async () => {
    await show(code);
    nowhere();
    const copyButton = copy && button(copy[1]);
    press(ENTER);
    expect(await calls()).toEqual(copy ? [["copyText", copy[0]]] : []);
    if (copyButton) expect(button("Copied")).toBe(copyButton);
  });

  it(`005 AC1: ${name}, ⌘O ${open === FOCUS_OPEN_ANYWAY ? "opens nothing and moves focus to Open anyway" : open ? `opens ${open}` : "opens nothing"}`, async () => {
    await show(code);
    nowhere();
    press(CMD_O);
    if (open === FOCUS_OPEN_ANYWAY) {
      expect(await calls()).toEqual([]);
      expect(document.activeElement).toBe(button("Open anyway"));
    } else {
      expect(await calls()).toEqual(open ? [["openLink", open]] : []);
    }
  });

  it(`005 AC1: ${name}, ⌘J ${join ? `joins ${join[0]}, once` : "joins nothing"}`, async () => {
    await show(code);
    nowhere();
    press(CMD_J);
    expect(await calls()).toEqual(join ? [["joinWifi", ...join]] : []);
    if (name === "WIFI") {
      expect(await screen.findByText("Connected to Home.")).toBeTruthy();
      press(CMD_J);
      expect(await calls()).toEqual([["joinWifi", "Home", "secret"]]);
    }
  });
}

// AC2: the card that holds focus, else the first card.

type Ac2Row = {
  title: string;
  codes: string[];
  /** Focuses a button before the key; nothing when focus stays nowhere. */
  focus?: () => HTMLElement;
  key: Init;
  calls: unknown[][];
  /** The button that holds focus afterwards. */
  focusAfter?: () => HTMLElement;
};

const AC2: Ac2Row[] = [
  {
    title: "LINK, WARNED, WIFI, focus nowhere: ⌘O opens LINK",
    codes: [LINK, WARNED, WIFI],
    key: CMD_O,
    calls: [["openLink", LINK]],
  },
  {
    title: "LINK, WARNED, WIFI, focus on the header's Scan again: ⌘O opens LINK",
    codes: [LINK, WARNED, WIFI],
    focus: () => button("Scan again"),
    key: CMD_O,
    calls: [["openLink", LINK]],
  },
  {
    title: "LINK, WARNED, WIFI, focus on WARNED's Copy: ⌘O opens nothing and focuses WARNED's Open anyway",
    codes: [LINK, WARNED, WIFI],
    focus: () => button("Copy", cardOf(WARNED)),
    key: CMD_O,
    calls: [],
    focusAfter: () => button("Open anyway", cardOf(WARNED)),
  },
  {
    title: "LINK, WARNED, WIFI, focus on WIFI's Copy password: ⌘O opens nothing",
    codes: [LINK, WARNED, WIFI],
    focus: () => button("Copy password", cardOf("Home")),
    key: CMD_O,
    calls: [],
  },
  {
    title: "LINK, WARNED, WIFI, focus on WIFI's Copy password: ⌘J joins Home",
    codes: [LINK, WARNED, WIFI],
    focus: () => button("Copy password", cardOf("Home")),
    key: CMD_J,
    calls: [["joinWifi", "Home", "secret"]],
  },
  {
    title: "LINK, WARNED, WIFI, focus nowhere: ⌘J joins nothing",
    codes: [LINK, WARNED, WIFI],
    key: CMD_J,
    calls: [],
  },
  {
    title: "WARNED, LINK, focus nowhere: ⌘O opens nothing and focuses WARNED's Open anyway",
    codes: [WARNED, LINK],
    key: CMD_O,
    calls: [],
    focusAfter: () => button("Open anyway", cardOf(WARNED)),
  },
  {
    title: "SMS, PLACE, focus nowhere: Enter copies the SMS number only",
    codes: [SMS, PLACE],
    key: ENTER,
    calls: [["copyText", "+31201234567"]],
  },
];

for (const row of AC2) {
  it(`005 AC2: ${row.title}`, async () => {
    await show(...row.codes);
    if (row.focus) {
      const target = row.focus();
      target.focus();
      expect(document.activeElement).toBe(target);
    } else {
      nowhere();
    }
    press(row.key);
    expect(await calls()).toEqual(row.calls);
    if (row.focusAfter) expect(document.activeElement).toBe(row.focusAfter());
  });
}

// AC3: Enter on a focused button only presses that button.

const firstPhoneCopy = () => {
  const phone = screen.getByText("+31612345678");
  const copies = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-describedby") === phone.id);
  expect(copies).toHaveLength(1);
  return copies[0];
};

const AC3: { title: string; code: string; button: () => HTMLElement; click?: unknown[][] }[] = [
  { title: "CONTACT, its first field Copy", code: CONTACT, button: firstPhoneCopy, click: [["copyText", "+31612345678"]] },
  { title: "CONTACT, its Dismiss", code: CONTACT, button: () => button("Dismiss") },
  { title: "LINK, its Open", code: LINK, button: () => button("Open") },
  { title: "LINK, the header's Scan again", code: LINK, button: () => button("Scan again") },
];

for (const row of AC3) {
  it(`005 AC3: ${row.title}: Enter is left to the button, and copies, opens and joins nothing`, async () => {
    await show(row.code);
    const target = row.button();
    target.focus();
    expect(document.activeElement).toBe(target);
    expect(fireEvent.keyDown(target, ENTER)).toBe(true);
    expect(await calls()).toEqual([]);
    if (row.click) {
      fireEvent.click(target);
      expect(await calls()).toEqual(row.click);
    }
  });
}

// AC4: no other key, and no state without a result card.

const OTHER_KEYS: [title: string, code: string, init: Init][] = [
  ["LINK, o without ⌘", LINK, { key: "o", code: "KeyO" }],
  ["LINK, ⌃O", LINK, { key: "o", code: "KeyO", ctrlKey: true }],
  ["WIFI, j without ⌘", WIFI, { key: "j", code: "KeyJ" }],
  ["WIFI, ⌃J", WIFI, { key: "j", code: "KeyJ", ctrlKey: true }],
  ["WIFI, a repeated Enter", WIFI, { ...ENTER, repeat: true }],
  ["WIFI, a repeated ⌘J", WIFI, { ...CMD_J, repeat: true }],
  ["LINK, a repeated ⌘O", LINK, { ...CMD_O, repeat: true }],
];

for (const [title, code, init] of OTHER_KEYS) {
  it(`005 AC4: (a) ${title} copies, opens and joins nothing`, async () => {
    await show(code);
    nowhere();
    press(init);
    expect(await calls()).toEqual([]);
  });
}

const VIEWS: [title: string, reach: () => void][] = [
  ["the idle view", () => {}],
  ["the Nothing found card", () => act(() => scan.result({ kind: "notFound" }))],
  [
    "a scan running after LINK was shown",
    () => {
      found(LINK);
      act(() => scan.started());
      expect(screen.getByText("Select the code…")).toBeTruthy();
    },
  ],
];

for (const [title, reach] of VIEWS) {
  for (const [keyName, init] of [
    ["Enter", ENTER],
    ["⌘O", CMD_O],
    ["⌘J", CMD_J],
  ] as const) {
    it(`005 AC4: (b) ${keyName} in ${title} copies, opens and joins nothing`, async () => {
      await start();
      reach();
      nowhere();
      press(init);
      expect(await calls()).toEqual([]);
    });
  }
}

it("005 AC4: (c) while the chip records, ⌘O becomes the shortcut and copies, opens and joins nothing", async () => {
  await start();
  fireEvent.click(await screen.findByRole("button", { name: /Shortcut ⇧⌘2/ }));
  nowhere();
  press(CMD_O);
  expect(ipc.setHotkey).toHaveBeenCalledWith("super+KeyO");
  expect(await calls()).toEqual([]);
});

it("005 AC4: (d) Esc with LINK shown hides the popover, and copies, opens and joins nothing", async () => {
  await show(LINK);
  nowhere();
  press(ESC);
  expect(ipc.hidePopover).toHaveBeenCalledOnce();
  expect(await calls()).toEqual([]);
});

// The cases around the criteria.

it("005: ⌘J does nothing more while Connect reads Connecting…", async () => {
  ipc.joinWifi.mockImplementationOnce(() => new Promise(() => {}));
  await show(WIFI);
  press(CMD_J);
  expect(button("Connecting…")).toBeTruthy();
  press(CMD_J);
  expect(await calls()).toEqual([["joinWifi", "Home", "secret"]]);
});

it("005: ⌘J tries again after a connection failed, as Connect does", async () => {
  ipc.joinWifi.mockImplementationOnce(() => Promise.reject("Failed to join network Home."));
  await show(WIFI);
  press(CMD_J);
  expect(await screen.findByText(/Could not connect/)).toBeTruthy();
  press(CMD_J);
  expect(await calls()).toEqual([
    ["joinWifi", "Home", "secret"],
    ["joinWifi", "Home", "secret"],
  ]);
});

it("005: once the first card is dismissed, the keys act on the next one", async () => {
  await show(LINK, WIFI);
  fireEvent.click(button("Dismiss", cardOf(LINK)));
  press(CMD_O);
  press(CMD_J);
  expect(await calls()).toEqual([["joinWifi", "Home", "secret"]]);
});

it("005: a new result replaces the cards the keys act on", async () => {
  await show(LINK);
  found(TEXT);
  press(CMD_O);
  press(ENTER);
  expect(await calls()).toEqual([["copyText", TEXT]]);
});

it("005: Enter and ⌘O after a failed scan copy and open nothing", async () => {
  await show(LINK);
  act(() => scan.result({ kind: "error", message: "Capture failed" }));
  press(ENTER);
  press(CMD_O);
  expect(await calls()).toEqual([]);
});

it("005: a key acts once under StrictMode, and not at all after the popover unmounts", async () => {
  const { unmount } = await start(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  found(LINK);
  press(ENTER);
  press(CMD_O);
  expect(await calls()).toEqual([
    ["copyText", LINK],
    ["openLink", LINK],
  ]);
  unmount();
  vi.clearAllMocks();
  press(ENTER);
  press(CMD_O);
  expect(await calls()).toEqual([]);
});

it("005: a cancelled scan brings the cards back, and the keys act on them again", async () => {
  await show(LINK);
  act(() => scan.started());
  press(CMD_O);
  act(() => scan.result({ kind: "cancelled" }));
  press(CMD_O);
  expect(await calls()).toEqual([["openLink", LINK]]);
});

it("005: after ⌘O on a warned link, a second ⌘O still opens nothing and Enter is left to Open anyway", async () => {
  await show(WARNED);
  press(CMD_O);
  const openAnyway = button("Open anyway");
  expect(document.activeElement).toBe(openAnyway);
  press(CMD_O);
  expect(document.activeElement).toBe(openAnyway);
  expect(press(ENTER)).toBe(true);
  expect(await calls()).toEqual([]);
});

it("005: a key the card acts on is not passed on; one it leaves alone is", async () => {
  await show(LINK);
  expect(press(CMD_O)).toBe(false);
  expect(press(ENTER)).toBe(false);
  expect(press(CMD_J)).toBe(true);
  cleanup();
  await show(SCRIPT);
  expect(press(CMD_O)).toBe(true);
});

// The hints: each key printed beside its button, never in it.

it("005: hints mark the primary Copy, Open and Connect, outside the buttons, which keep their names", async () => {
  await show(LINK, WIFI, PLACE);
  const marks = (card: HTMLElement) => Array.from(card.querySelectorAll("kbd")).map((k) => k.textContent);
  expect(marks(cardOf(LINK))).toEqual(["↩", "⌘O"]);
  expect(marks(cardOf("Home"))).toEqual(["↩", "⌘J"]);
  expect(marks(cardOf("Opera House"))).toEqual(["↩", "⌘O"]);
  for (const kbd of document.querySelectorAll("kbd")) expect(kbd.closest("button")).toBeNull();
  expect(button("Copy", cardOf(LINK)).getAttribute("aria-keyshortcuts")).toBe("Enter");
  expect(button("Open", cardOf(LINK)).getAttribute("aria-keyshortcuts")).toBe("Meta+O");
  expect(button("Connect").getAttribute("aria-keyshortcuts")).toBe("Meta+J");
  expect(button("Open in Maps").getAttribute("aria-keyshortcuts")).toBe("Meta+O");
});

it("005: no hint suggests that ⌘O opens a warned link, or copies on an open network", async () => {
  await show(WARNED, OPEN_WIFI);
  const warned = cardOf(WARNED);
  expect(Array.from(warned.querySelectorAll("kbd")).map((k) => k.textContent)).toEqual(["↩"]);
  expect(button("Open anyway", warned).hasAttribute("aria-keyshortcuts")).toBe(false);
  expect(Array.from(cardOf("Guest").querySelectorAll("kbd")).map((k) => k.textContent)).toEqual(["⌘J"]);
});
