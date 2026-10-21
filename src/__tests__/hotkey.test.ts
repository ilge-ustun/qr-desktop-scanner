import { describe, expect, it } from "vitest";

import { label, record } from "../lib/hotkey";

const press = (code: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("record", () => {
  it("writes modifiers in the crate's order, then the key code", () => {
    expect(record(press("Digit2", { metaKey: true, shiftKey: true }))).toEqual({
      kind: "shortcut",
      accelerator: "shift+super+Digit2",
    });
    expect(record(press("KeyQ", { ctrlKey: true, altKey: true, metaKey: true, shiftKey: true }))).toEqual({
      kind: "shortcut",
      accelerator: "shift+control+alt+super+KeyQ",
    });
  });

  it("keeps listening while only modifiers are down", () => {
    for (const code of ["MetaLeft", "ShiftRight", "AltLeft", "ControlLeft"]) {
      expect(record(press(code, { metaKey: true })), code).toEqual({ kind: "incomplete" });
    }
  });

  it("refuses a plain key or Shift + key, which are just typing", () => {
    expect(record(press("KeyA"))).toEqual({ kind: "needsModifier" });
    expect(record(press("KeyA", { shiftKey: true }))).toEqual({ kind: "needsModifier" });
  });
});

describe("label", () => {
  it("shows the keys the Mac way, modifiers in ⌃⌥⇧⌘ order", () => {
    expect(label("shift+super+Digit2")).toBe("⇧⌘2");
    expect(label("shift+control+alt+super+KeyQ")).toBe("⌃⌥⇧⌘Q");
    expect(label("alt+super+Space")).toBe("⌥⌘Space");
    expect(label("control+super+ArrowLeft")).toBe("⌃⌘←");
  });

  it("reads other spellings the crate accepts", () => {
    expect(label("Option+Cmd+KeyK")).toBe("⌥⌘K");
  });
});
