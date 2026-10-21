import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HotkeyButton } from "../components/HotkeyButton";

afterEach(cleanup);

const chip = (onPick: (a: string) => Promise<string> = (a) => Promise.resolve(a)) => {
  const props = { onRecordStart: vi.fn(), onRecordCancel: vi.fn(), onPick: vi.fn(onPick) };
  render(<HotkeyButton current="shift+super+Digit2" {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Shortcut ⇧⌘2/ }));
  return props;
};

describe("HotkeyButton", () => {
  it("records while waiting for keys, and Esc cancels", () => {
    const { onRecordStart, onRecordCancel, onPick } = chip();
    expect(onRecordStart).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Press the new shortcut" })).toBeTruthy();
    fireEvent.keyDown(window, { code: "Escape", key: "Escape" });
    expect(onRecordCancel).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Shortcut ⇧⌘2/ })).toBeTruthy();
  });

  it("waits through modifier presses for the real key", () => {
    const { onPick } = chip();
    fireEvent.keyDown(window, { code: "MetaLeft", key: "Meta", metaKey: true });
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { code: "KeyK", key: "k", metaKey: true, altKey: true });
    expect(onPick).toHaveBeenCalledWith("alt+super+KeyK");
  });

  it("says a plain key needs a modifier, and keeps the old shortcut", () => {
    const { onRecordCancel, onPick } = chip();
    fireEvent.keyDown(window, { code: "KeyA", key: "a" });
    expect(onPick).not.toHaveBeenCalled();
    expect(onRecordCancel).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toMatch(/⌘, ⌃ or ⌥/);
  });

  it("shows why a shortcut was refused", async () => {
    chip(() => Promise.reject("Another app already uses that shortcut."));
    fireEvent.keyDown(window, { code: "Space", key: " ", metaKey: true });
    expect((await screen.findByRole("alert")).textContent).toBe("Another app already uses that shortcut.");
  });
});
