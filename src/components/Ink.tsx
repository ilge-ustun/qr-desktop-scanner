// The small pieces every screen is built from: Risograph print, two inks.
import type { ReactNode } from "react";

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
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <button type="button" className={big ? "primary big" : "primary"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
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
