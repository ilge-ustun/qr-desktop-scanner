// ipc.ts is the unit under test here, so this is the one file that mocks
// @tauri-apps/api itself rather than ipc.ts.
import { afterEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => {
  const listeners = new Map<string, (event: { payload: unknown }) => void>();
  return {
    listeners,
    invoke: vi.fn(() => Promise.resolve()),
    listen: vi.fn((name: string, callback: (event: { payload: unknown }) => void) => {
      listeners.set(name, callback);
      return Promise.resolve(() => listeners.delete(name));
    }),
    writeText: vi.fn(() => Promise.resolve()),
  };
});
vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: tauri.listen }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ writeText: tauri.writeText }));

import { findAllOnScreen, onScan, startScan } from "../lib/ipc";

afterEach(() => {
  vi.clearAllMocks();
  tauri.listeners.clear();
});

describe("ipc", () => {
  it("AC3: findAllOnScreen invokes find_all_on_screen once, with no arguments", async () => {
    await findAllOnScreen();
    expect(tauri.invoke.mock.calls).toStrictEqual([["find_all_on_screen"]]);
  });

  it("AC3: startScan still invokes start_scan, with no arguments", async () => {
    await startScan();
    expect(tauri.invoke.mock.calls).toStrictEqual([["start_scan"]]);
  });

  it("AC5: onScan passes the scope of scan://started to its started handler", async () => {
    const started = vi.fn();
    const result = vi.fn();
    await onScan({ started, result });
    tauri.listeners.get("scan://started")?.({ payload: "screen" });
    expect(started.mock.calls).toStrictEqual([["screen"]]);
    tauri.listeners.get("scan://started")?.({ payload: "area" });
    expect(started.mock.calls).toStrictEqual([["screen"], ["area"]]);
    expect(result).not.toHaveBeenCalled();
  });

  it("onScan passes the outcome of scan://result to its result handler", async () => {
    const started = vi.fn();
    const result = vi.fn();
    const unlisten = await onScan({ started, result });
    tauri.listeners.get("scan://result")?.({ payload: { kind: "notFound" } });
    expect(result.mock.calls).toStrictEqual([[{ kind: "notFound" }]]);
    expect(started).not.toHaveBeenCalled();
    unlisten();
    expect([...tauri.listeners.keys()]).toStrictEqual([]);
  });
});
