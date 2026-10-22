// Shortcuts as the global-hotkey crate writes them: "shift+control+alt+super+KeyQ"
// (modifiers in that order, then a KeyboardEvent.code), and as a Mac shows them: ⌃⌥⇧⌘Q.

export type KeyPress = {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

type Recorded =
  | { kind: "incomplete" } // only modifiers so far: keep listening
  | { kind: "needsModifier" } // a plain key, or Shift + key
  | { kind: "shortcut"; accelerator: string };

const MODIFIER_CODES = /^(Meta|Control|Alt|Shift|OS|CapsLock|Fn)(Left|Right)?$/;

export function record(press: KeyPress): Recorded {
  if (MODIFIER_CODES.test(press.code)) return { kind: "incomplete" };
  if (!press.metaKey && !press.ctrlKey && !press.altKey) return { kind: "needsModifier" };
  const parts = [
    press.shiftKey && "shift",
    press.ctrlKey && "control",
    press.altKey && "alt",
    press.metaKey && "super",
    press.code,
  ].filter(Boolean);
  return { kind: "shortcut", accelerator: parts.join("+") };
}

const MODIFIER_SYMBOLS: [string, string][] = [
  ["control", "⌃"],
  ["alt", "⌥"],
  ["shift", "⇧"],
  ["super", "⌘"],
];

const KEY_NAMES: Record<string, string> = {
  Space: "Space",
  Enter: "↩",
  Tab: "⇥",
  Backspace: "⌫",
  Delete: "⌦",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
};

function keyName(code: string): string {
  const letterOrDigit = /^(?:Key|Digit)(.)$/.exec(code);
  if (letterOrDigit) return letterOrDigit[1];
  return KEY_NAMES[code] ?? code;
}

/** "shift+super+Digit2" → "⇧⌘2". Matching is case-insensitive, like the crate's. */
export function label(accelerator: string): string {
  const parts = accelerator.split("+");
  const lower = parts.map((p) => p.toLowerCase());
  const has = (name: string) =>
    lower.includes(name) ||
    (name === "super" && (lower.includes("cmd") || lower.includes("command"))) ||
    (name === "alt" && lower.includes("option")) ||
    (name === "control" && lower.includes("ctrl"));
  const mods = MODIFIER_SYMBOLS.filter(([name]) => has(name))
    .map(([, symbol]) => symbol)
    .join("");
  return mods + keyName(parts[parts.length - 1]);
}
