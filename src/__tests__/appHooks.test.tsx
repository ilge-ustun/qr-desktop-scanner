// Story 017: App keeps its side effects in five named hooks. AC4 to AC7.
import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { importsOf, matches, sourceOf, sources } from "./sourceText";

const ipc = vi.hoisted(() => ({
  startScan: vi.fn(() => Promise.resolve()),
  findAllOnScreen: vi.fn(() => Promise.resolve()),
  screenPermission: vi.fn((): Promise<boolean> => Promise.resolve(true)),
  onScan: vi.fn<(h: unknown) => Promise<() => void>>(() => Promise.resolve(() => {})),
  fitPopover: vi.fn<(h: number) => Promise<void>>(() => Promise.resolve()),
  hidePopover: vi.fn(() => Promise.resolve()),
  openScreenSettings: vi.fn(() => Promise.resolve()),
  copyText: vi.fn(() => Promise.resolve()),
  openLink: vi.fn(() => Promise.resolve()),
  joinWifi: vi.fn(() => Promise.resolve()),
  getHotkey: vi.fn((): Promise<string | null> => Promise.resolve("shift+super+Digit2")),
  suspendHotkey: vi.fn(() => Promise.resolve()),
  resumeHotkey: vi.fn(() => Promise.resolve()),
  setHotkey: vi.fn((a: string) => Promise.resolve(a)),
}));
vi.mock("../lib/ipc", () => ipc);

import { App } from "../App";

type Proc = { on(e: string, f: (r: unknown) => void): void; off(e: string, f: (r: unknown) => void): void };
const proc = (globalThis as { process?: Proc }).process!;

const originalObserver = globalThis.ResizeObserver;
const rejected = vi.fn<(r: unknown) => void>();

type Stub = { callback: () => void; observed: Element[]; disconnect: Mock<() => void> };
let stubs: Stub[] = [];

beforeEach(() => {
  stubs = [];
  globalThis.ResizeObserver = class {
    stub: Stub;
    constructor(callback: () => void) {
      this.stub = { callback, observed: [], disconnect: vi.fn<() => void>() };
      stubs.push(this.stub);
    }
    observe(el: Element) {
      this.stub.observed.push(el);
    }
    disconnect() {
      this.stub.disconnect();
    }
  } as unknown as typeof ResizeObserver;
  proc.on("unhandledRejection", rejected);
});

afterEach(() => {
  cleanup();
  proc.off("unhandledRejection", rejected);
  rejected.mockClear();
  globalThis.ResizeObserver = originalObserver;
  vi.clearAllMocks();
  ipc.screenPermission.mockImplementation(() => Promise.resolve(true));
  ipc.getHotkey.mockImplementation(() => Promise.resolve("shift+super+Digit2"));
  ipc.onScan.mockImplementation(() => Promise.resolve(() => {}));
});

const macrotask = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

describe("AC4 viewfinder", () => {
  it("AC4 has the class viewfinder and no other", async () => {
    render(<App />);
    await vi.waitFor(() => expect(ipc.onScan).toHaveBeenCalled());
    const el = document.querySelector(".viewfinder");
    expect(el).not.toBeNull();
    expect(el!.className).toBe("viewfinder");
  });
});

describe("AC5 App calls five hooks", () => {
  const all = sources(
    import.meta.glob(["/src/App.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>,
  );
  const app = sourceOf(all, "/src/App.tsx");
  const HOOKS = ["useHotkey", "useScanEvents", "usePermissionCheck", "useEscapeHides", "useFitPopover"];

  for (const hook of HOOKS) {
    it(`AC5 calls ${hook} once`, () => {
      expect(matches(all, new RegExp(`\\b${hook}\\(`))).toEqual({ "/src/App.tsx": 1 });
    });
    it(`AC5 imports ${hook} from src/components or src/hooks`, () => {
      const named = app.ast.statements.flatMap((s) =>
        s.kind === 273 /* ImportDeclaration */ && s.getText(app.ast).includes(hook) ? [s] : [],
      );
      expect(named).toHaveLength(1);
      const text = named[0].getText(app.ast);
      expect(text).toMatch(new RegExp(`\\{[^}]*\\b${hook}\\b[^}]*\\}`));
      const path = importsOf(app).find((p) => p.startsWith("/src/components/") || p.startsWith("/src/hooks/"));
      expect(path).toBeDefined();
      const spec = /from\s+"([^"]+)"/.exec(text)![1];
      expect(spec.startsWith(".")).toBe(true);
      const resolved = new URL(spec, "file:///src/App.tsx").pathname;
      expect(resolved.startsWith("/src/components/") || resolved.startsWith("/src/hooks/")).toBe(true);
    });
  }

  const FORBIDDEN: [string, RegExp][] = [
    ["useEffect", /\buse(Layout)?Effect\b/],
    ["useState", /\buseState\b/],
    ["addEventListener", /\baddEventListener\b/],
    ["ResizeObserver", /\bResizeObserver\b/],
    [
      "ipc side-effect call",
      /\bipc\.(getHotkey|setHotkey|suspendHotkey|resumeHotkey|onScan|screenPermission|hidePopover|fitPopover)\b/,
    ],
  ];
  for (const [name, re] of FORBIDDEN) {
    it(`AC5 App.tsx has no ${name}`, () => {
      expect(matches(all, re)).toEqual({});
    });
  }
  it("AC5 no import names one of the eight ipc functions", () => {
    const eight = /\b(getHotkey|setHotkey|suspendHotkey|resumeHotkey|onScan|screenPermission|hidePopover|fitPopover)\b/;
    const imports = app.code.match(/import\s[^;]*?from\s+"[^"]+"/gs) ?? [];
    for (const decl of imports) {
      if (/lib\/ipc"/.test(decl)) expect(decl).not.toMatch(eight);
    }
  });
});

describe("AC6 rejections and the permission screen", () => {
  it("AC6 screenPermission rejects: nothing unhandled, start view", async () => {
    ipc.screenPermission.mockImplementation(() => Promise.reject("screen_permission failed"));
    render(<App />);
    await vi.waitFor(() => expect(ipc.screenPermission).toHaveBeenCalled());
    await macrotask();
    expect(rejected).not.toHaveBeenCalled();
    expect(ipc.screenPermission).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Scan" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Find all on screen" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText("Screen access needed")).toBeNull();
  });

  it("AC6 screenPermission false shows the permission screen", async () => {
    ipc.screenPermission.mockImplementation(() => Promise.resolve(false));
    render(<App />);
    await vi.waitFor(() => expect(ipc.screenPermission).toHaveBeenCalled());
    await macrotask();
    expect(screen.getByText("Screen access needed")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Scan" })).toBeNull();
  });

  it("AC6 getHotkey rejects: nothing unhandled, chip says Set shortcut", async () => {
    ipc.getHotkey.mockImplementation(() => Promise.reject("get_hotkey failed"));
    render(<App />);
    await vi.waitFor(() => expect(ipc.getHotkey).toHaveBeenCalled());
    await macrotask();
    expect(rejected).not.toHaveBeenCalled();
    const chip = screen.getByRole("button", { name: "Shortcut not set, click to change" });
    expect(chip.textContent).toBe("Set shortcut");
  });
});

describe("AC7 listeners live while mounted, under StrictMode", () => {
  it("AC7 scan, Esc and ResizeObserver start and stop with App", async () => {
    const unlistens: Mock<() => void>[] = [];
    ipc.onScan.mockImplementation(() => {
      const u = vi.fn<() => void>();
      unlistens.push(u);
      return Promise.resolve(u);
    });
    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => {});

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(ipc.hidePopover).toHaveBeenCalledTimes(1);

    const live = stubs.filter((s) => s.disconnect.mock.calls.length === 0);
    expect(live).toHaveLength(1);
    const popover = document.querySelector("main.popover")!;
    expect(live[0].observed).toEqual([popover]);
    Object.defineProperty(popover, "offsetHeight", { value: 300.2, configurable: true });
    live[0].callback();
    expect(ipc.fitPopover).toHaveBeenCalledWith(307);

    unmount();
    await act(async () => {});
    expect(unlistens.length).toBeGreaterThan(0);
    for (const u of unlistens) expect(u).toHaveBeenCalledTimes(1);
    for (const s of stubs) expect(s.disconnect).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(ipc.hidePopover).toHaveBeenCalledTimes(1);
  });
});
