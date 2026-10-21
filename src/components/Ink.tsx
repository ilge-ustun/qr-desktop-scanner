// The small pieces every screen is built from: Risograph print, two inks.
import type { ReactNode } from "react";

import { SHORTCUTS, type CardKey } from "../lib/cardKeys";

export type Tone = "ok" | "warn" | "danger";

/** The viewfinder brackets in the corners of a framed box. */
export function Corners() {
  return (
    <span className="corners" aria-hidden="true">
      <span className="c-tl" />
      <span className="c-tr" />
      <span className="c-bl" />
      <span className="c-br" />
    </span>
  );
}

/** The solid ink button, with the second ink printed off-register behind it. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  big,
  keyshortcuts,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  big?: boolean;
  /** The key that presses it, for screen readers (see Keyed). */
  keyshortcuts?: string;
}) {
  return (
    <button
      type="button"
      className={big ? "primary big" : "primary"}
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={keyshortcuts}
    >
      {children}
    </button>
  );
}

/** A button with the key that presses it printed on its corner, like a keycap,
 * in the mono face of the shortcut chip (Silkscreen has no ⌘). The mark is
 * beside the button, not in it, so the button keeps its name; the button names
 * the key to screen readers itself, with aria-keyshortcuts. */
export function Keyed({ shortcut, children }: { shortcut: CardKey; children: ReactNode }) {
  return (
    <span className="keyed">
      {children}
      <kbd className="keycap" aria-hidden="true">
        {SHORTCUTS[shortcut].hint}
      </kbd>
    </span>
  );
}

export function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8 2.2l6.2 11H1.8z" />
      <path d="M8 6.5v3M8 11.4v.1" />
    </svg>
  );
}
