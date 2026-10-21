// The keys a result card answers: Enter copies, ⌘O opens, ⌘J connects. Each
// runs what the card's own button runs; a card without that button ignores it.
import { label, type KeyPress } from "./hotkey";

export type CardKey = "copy" | "open" | "join";

/** What a result card runs for each key it answers. */
export type CardKeys = Partial<Record<CardKey, () => void>>;

/** Each key as the card prints it beside its button (the shortcut chip's
 * glyphs), and as screen readers name it (aria-keyshortcuts). */
export const SHORTCUTS: Record<CardKey, { hint: string; aria: string }> = {
  copy: { hint: label("Enter"), aria: "Enter" },
  open: { hint: label("super+KeyO"), aria: "Meta+O" },
  join: { hint: label("super+KeyJ"), aria: "Meta+J" },
};

/** The letter a key types: the layout's, or, on a layout that types no Latin
 * letter there, the key's place, as macOS reads ⌘ shortcuts. */
function letter({ key, code }: { key: string; code: string }): string | null {
  if (/^[a-z]$/i.test(key)) return key.toLowerCase();
  return /^Key([A-Z])$/.exec(code)?.[1].toLowerCase() ?? null;
}

/** Which card key a keydown is: Enter alone, or ⌘ alone with O or J. Ctrl is
 * not ⌘, and a key held down does not fire again. */
export function cardKey(press: KeyPress & { key: string; repeat: boolean }): CardKey | null {
  if (press.repeat || press.ctrlKey || press.altKey || press.shiftKey) return null;
  if (!press.metaKey) return press.key === "Enter" ? "copy" : null;
  switch (letter(press)) {
    case "o":
      return "open";
    case "j":
      return "join";
    default:
      return null;
  }
}
