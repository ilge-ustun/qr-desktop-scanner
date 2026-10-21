import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let emit: (outcome: unknown) => void = () => {};
const ipc = vi.hoisted(() => ({
  startScan: vi.fn(() => Promise.resolve()),
  screenPermission: vi.fn(() => Promise.resolve(true)),
  onScan: vi.fn((h: { result: (o: unknown) => void }) => {
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

describe("App", () => {
  it("scans from the Scan button", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    expect(ipc.startScan).toHaveBeenCalledOnce();
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
});
