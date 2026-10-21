import { describe, expect, it } from "vitest";

import { initialState, reduce, type State } from "../lib/scanState";

const found: State = {
  view: { name: "found", codes: [{ text: "https://example.com", format: "qrcode" }] },
  beforeScan: { name: "idle" },
};

describe("reduce", () => {
  it("shows the codes a scan found", () => {
    const scanning = reduce(initialState, { type: "started" });
    expect(scanning.view).toEqual({ name: "scanning" });
    const done = reduce(scanning, {
      type: "result",
      outcome: { kind: "found", codes: [{ text: "x", format: "qrcode" }] },
    });
    expect(done.view).toEqual({ name: "found", codes: [{ text: "x", format: "qrcode" }] });
  });

  it("goes back to the previous result when a scan is cancelled", () => {
    const scanning = reduce(found, { type: "started" });
    const cancelled = reduce(scanning, { type: "result", outcome: { kind: "cancelled" } });
    expect(cancelled.view).toEqual(found.view);
  });

  it("asks for permission when the scan was refused", () => {
    const next = reduce(initialState, { type: "result", outcome: { kind: "permissionDenied" } });
    expect(next.view).toEqual({ name: "permission" });
  });

  it("reports nothing found and errors", () => {
    expect(reduce(found, { type: "result", outcome: { kind: "notFound" } }).view).toEqual({ name: "notFound" });
    expect(reduce(found, { type: "result", outcome: { kind: "error", message: "boom" } }).view).toEqual({
      name: "error",
      message: "boom",
    });
  });
});
