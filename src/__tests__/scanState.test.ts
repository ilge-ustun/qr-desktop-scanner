import { describe, expect, it } from "vitest";

import { initialState, reduce, type State } from "../lib/scanState";

const found: State = {
  view: { name: "found", codes: [{ text: "https://example.com", format: "qrcode" }] },
  beforeScan: { name: "idle" },
  scope: "area",
};

describe("reduce", () => {
  it("shows the codes a scan found", () => {
    const scanning = reduce(initialState, { type: "started", scope: "area" });
    expect(scanning.view).toEqual({ name: "scanning" });
    const done = reduce(scanning, {
      type: "result",
      outcome: { kind: "found", codes: [{ text: "x", format: "qrcode" }] },
    });
    expect(done.view).toEqual({ name: "found", codes: [{ text: "x", format: "qrcode" }] });
  });

  it("goes back to the previous result when a scan is cancelled", () => {
    const scanning = reduce(found, { type: "started", scope: "area" });
    const cancelled = reduce(scanning, { type: "result", outcome: { kind: "cancelled" } });
    expect(cancelled.view).toEqual(found.view);
  });

  it("asks for permission when the scan was refused", () => {
    const next = reduce(initialState, { type: "result", outcome: { kind: "permissionDenied" } });
    expect(next.view).toEqual({ name: "permission" });
  });

  it("reports nothing found and errors", () => {
    expect(reduce(found, { type: "result", outcome: { kind: "notFound" } }).view).toEqual({
      name: "notFound",
      scope: "area",
    });
    expect(reduce(found, { type: "result", outcome: { kind: "error", message: "boom" } }).view).toEqual({
      name: "error",
      message: "boom",
    });
  });

  it("dismisses one card, and returns to the start when none is left", () => {
    const two: State = {
      view: {
        name: "found",
        codes: [
          { text: "a", format: "qrcode" },
          { text: "b", format: "qrcode" },
        ],
      },
      beforeScan: { name: "idle" },
      scope: "screen",
    };
    const one = reduce(two, { type: "dismiss", text: "a" });
    expect(one.view).toEqual({ name: "found", codes: [{ text: "b", format: "qrcode" }] });
    expect(reduce(one, { type: "dismiss", text: "b" }).view).toEqual({ name: "idle" });
  });

  it("tells the not-found view which kind of scan found nothing", () => {
    for (const scope of ["area", "screen"] as const) {
      const scanning = reduce(found, { type: "started", scope });
      expect(scanning.view).toEqual({ name: "scanning" });
      const nothing = reduce(scanning, { type: "result", outcome: { kind: "notFound" } });
      expect(nothing.view).toEqual({ name: "notFound", scope });
    }
  });

  it("keeps the scope of the latest scan, not an earlier one", () => {
    const screen = reduce(initialState, { type: "started", scope: "screen" });
    const shown = reduce(screen, {
      type: "result",
      outcome: { kind: "found", codes: [{ text: "x", format: "qrcode" }] },
    });
    const area = reduce(shown, { type: "started", scope: "area" });
    expect(reduce(area, { type: "result", outcome: { kind: "notFound" } }).view).toEqual({
      name: "notFound",
      scope: "area",
    });
  });

  it("goes back to the start screen from any result", () => {
    expect(reduce(found, { type: "reset" }).view).toEqual({ name: "idle" });
    const nothing = reduce(found, { type: "result", outcome: { kind: "notFound" } });
    expect(reduce(nothing, { type: "reset" }).view).toEqual({ name: "idle" });
  });
});
