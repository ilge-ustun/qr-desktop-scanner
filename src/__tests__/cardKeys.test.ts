import { describe, expect, it } from "vitest";

import { cardKey, SHORTCUTS } from "../lib/cardKeys";

const press = (init: Partial<Parameters<typeof cardKey>[0]>) =>
  cardKey({ key: "", code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, repeat: false, ...init });

describe("cardKey", () => {
  it("reads Enter as Copy, ⌘O as Open and ⌘J as Join", () => {
    expect(press({ key: "Enter", code: "Enter" })).toBe("copy");
    expect(press({ key: "Enter", code: "NumpadEnter" })).toBe("copy");
    expect(press({ key: "o", code: "KeyO", metaKey: true })).toBe("open");
    expect(press({ key: "j", code: "KeyJ", metaKey: true })).toBe("join");
  });

  it("needs ⌘ for O and J, and Ctrl does not count as ⌘", () => {
    expect(press({ key: "o", code: "KeyO" })).toBeNull();
    expect(press({ key: "j", code: "KeyJ" })).toBeNull();
    expect(press({ key: "o", code: "KeyO", ctrlKey: true })).toBeNull();
    expect(press({ key: "j", code: "KeyJ", ctrlKey: true })).toBeNull();
  });

  it("takes a key with any other modifier as some other shortcut", () => {
    expect(press({ key: "o", code: "KeyO", metaKey: true, ctrlKey: true })).toBeNull();
    expect(press({ key: "o", code: "KeyO", metaKey: true, shiftKey: true })).toBeNull();
    expect(press({ key: "j", code: "KeyJ", metaKey: true, altKey: true })).toBeNull();
    expect(press({ key: "Enter", code: "Enter", metaKey: true })).toBeNull();
    expect(press({ key: "Enter", code: "Enter", shiftKey: true })).toBeNull();
    expect(press({ key: "Enter", code: "Enter", ctrlKey: true })).toBeNull();
  });

  it("does not fire again on a key held down", () => {
    expect(press({ key: "Enter", code: "Enter", repeat: true })).toBeNull();
    expect(press({ key: "o", code: "KeyO", metaKey: true, repeat: true })).toBeNull();
    expect(press({ key: "j", code: "KeyJ", metaKey: true, repeat: true })).toBeNull();
  });

  it("reads other keys as nothing", () => {
    expect(press({ key: "Escape", code: "Escape" })).toBeNull();
    expect(press({ key: " ", code: "Space" })).toBeNull();
    expect(press({ key: "c", code: "KeyC", metaKey: true })).toBeNull();
    expect(press({ key: "Meta", code: "MetaLeft", metaKey: true })).toBeNull();
  });

  it("follows the letter the layout types, and the key's place when the layout types no Latin letter", () => {
    expect(press({ key: "O", code: "KeyO", metaKey: true })).toBe("open"); // Caps Lock
    expect(press({ key: "o", code: "KeyS", metaKey: true })).toBe("open"); // Dvorak
    expect(press({ key: "r", code: "KeyO", metaKey: true })).toBeNull(); // Dvorak: the key that types r
    expect(press({ key: "щ", code: "KeyO", metaKey: true })).toBe("open"); // Russian
    expect(press({ key: "о", code: "KeyJ", metaKey: true })).toBe("join"); // Russian: a Cyrillic о
  });
});

describe("SHORTCUTS", () => {
  it("prints the keys with the shortcut chip's glyphs, and names them for screen readers", () => {
    expect(SHORTCUTS).toEqual({
      copy: { hint: "↩", aria: "Enter" },
      open: { hint: "⌘O", aria: "Meta+O" },
      join: { hint: "⌘J", aria: "Meta+J" },
    });
  });
});
