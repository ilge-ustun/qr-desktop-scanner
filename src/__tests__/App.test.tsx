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

  it("scans from the shortcut key shown in the header", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "⌘⇧2" }));
    expect(ipc.startScan).toHaveBeenCalledOnce();
  });
});
