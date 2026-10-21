import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ipc = vi.hoisted(() => ({
  startScan: vi.fn(() => Promise.resolve()),
  screenPermission: vi.fn(() => Promise.resolve(true)),
  onScan: vi.fn(() => Promise.resolve(() => {})),
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
});
