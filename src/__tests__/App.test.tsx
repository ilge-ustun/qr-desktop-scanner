import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let start: (scope: string) => void = () => {};
let emit: (outcome: unknown) => void = () => {};
const ipc = vi.hoisted(() => ({
  startScan: vi.fn(() => Promise.resolve()),
  findAllOnScreen: vi.fn(() => Promise.resolve()),
  screenPermission: vi.fn(() => Promise.resolve(true)),
  onScan: vi.fn((h: { started: (scope: string) => void; result: (o: unknown) => void }) => {
    start = h.started;
    emit = h.result;
    return Promise.resolve(() => {});
  }),
  fitPopover: vi.fn(() => Promise.resolve()),
  hidePopover: vi.fn(() => Promise.resolve()),
  openScreenSettings: vi.fn(() => Promise.resolve()),
  copyText: vi.fn(() => Promise.resolve()),
  openLink: vi.fn(() => Promise.resolve()),
  joinWifi: vi.fn(() => Promise.resolve()),
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

const AREA_NOTICE = "No QR code in that area. Try a box around the whole code, including its white border.";

async function rendered() {
  render(<App />);
  await vi.waitFor(() => expect(ipc.onScan).toHaveBeenCalled());
}

function notice() {
  const notices = document.querySelectorAll(".notice");
  expect(notices).toHaveLength(1);
  return notices[0].textContent ?? "";
}

const scanButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Scan" });
const findAllButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Find all on screen" });

describe("App", () => {
  it("AC2: the Scan button starts only the drag scan", () => {
    render(<App />);
    fireEvent.click(scanButton());
    expect(ipc.startScan).toHaveBeenCalledOnce();
    expect(ipc.findAllOnScreen).not.toHaveBeenCalled();
  });

  it("AC1: Find all on screen is the secondary button right under Scan, and starts a whole-screen scan", () => {
    render(<App />);
    const findAll = findAllButton();
    expect(scanButton().nextElementSibling).toBe(findAll);
    expect(findAll.classList.contains("ghost")).toBe(true);
    expect(findAll.classList.contains("primary")).toBe(false);
    fireEvent.click(findAll);
    expect(ipc.findAllOnScreen).toHaveBeenCalledOnce();
    expect(ipc.startScan).not.toHaveBeenCalled();
  });

  it("AC2: both buttons are disabled while a scan of either kind runs, and enabled again after", async () => {
    await rendered();
    for (const scope of ["area", "screen"]) {
      expect(scanButton().disabled).toBe(false);
      expect(findAllButton().disabled).toBe(false);
      act(() => start(scope));
      expect(scanButton().disabled).toBe(true);
      expect(findAllButton().disabled).toBe(true);
      fireEvent.click(findAllButton());
      fireEvent.click(scanButton());
      expect(ipc.findAllOnScreen).not.toHaveBeenCalled();
      expect(ipc.startScan).not.toHaveBeenCalled();
      // Esc on the selection: back to the start, ready for another scan.
      act(() => emit({ kind: "cancelled" }));
    }
  });

  it("AC4: a found outcome with three codes shows three cards, in its order", async () => {
    await rendered();
    act(() => start("screen"));
    act(() =>
      emit({
        kind: "found",
        codes: [
          { text: "first code", format: "qrcode" },
          { text: "second code", format: "qrcode" },
          { text: "third code", format: "qrcode" },
        ],
      }),
    );
    const cards = [...document.querySelectorAll("article.card")];
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.querySelector(".content")?.textContent)).toEqual([
      "first code",
      "second code",
      "third code",
    ]);
  });

  it("shows the saved shortcut, and clicking it records a new one instead of scanning", async () => {
    render(<App />);
    const chip = await screen.findByRole("button", { name: /Shortcut ⇧⌘2/ });
    fireEvent.click(chip);
    expect(ipc.startScan).not.toHaveBeenCalled();
    expect(ipc.suspendHotkey).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { code: "KeyQ", key: "q", metaKey: true, ctrlKey: true });
    expect(ipc.setHotkey).toHaveBeenCalledWith("control+super+KeyQ");
    expect(await screen.findByRole("button", { name: /Shortcut ⌃⌘Q/ })).toBeTruthy();
  });

  it("closes a 'nothing found' result back to the start screen", async () => {
    render(<App />);
    await vi.waitFor(() => expect(ipc.onScan).toHaveBeenCalled());
    act(() => emit({ kind: "notFound" }));
    expect(screen.getByText("Nothing found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Nothing found")).toBeNull();
    expect(screen.getByRole("button", { name: "Scan" })).toBeTruthy();
  });

  it("AC5: after a whole-screen scan finds nothing, the notice says the screen was searched, not a box", async () => {
    await rendered();
    act(() => start("screen"));
    act(() => emit({ kind: "notFound" }));
    const text = notice();
    expect(text).toMatch(/screen/i);
    expect(text).not.toMatch(/that area/i);
    expect(text).not.toMatch(/box/i);
  });

  it("AC5: after a drag scan finds nothing, the notice is the area sentence, unchanged", async () => {
    await rendered();
    act(() => start("area"));
    act(() => emit({ kind: "notFound" }));
    expect(notice()).toBe(AREA_NOTICE);
  });

  it("AC5: each scan's notice follows its own scope, whichever ran before", async () => {
    await rendered();
    act(() => start("screen"));
    act(() => emit({ kind: "notFound" }));
    expect(notice()).not.toBe(AREA_NOTICE);
    // "Scan again" from the not-found card is a drag scan.
    act(() => start("area"));
    act(() => emit({ kind: "notFound" }));
    expect(notice()).toBe(AREA_NOTICE);
    act(() => start("screen"));
    act(() => emit({ kind: "found", codes: [{ text: "a code", format: "qrcode" }] }));
    act(() => start("area"));
    act(() => emit({ kind: "notFound" }));
    expect(notice()).toBe(AREA_NOTICE);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => start("screen"));
    act(() => emit({ kind: "notFound" }));
    expect(notice()).toMatch(/screen/i);
  });
});
