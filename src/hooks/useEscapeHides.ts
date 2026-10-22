import { useEffect } from "react";

import * as ipc from "../lib/ipc";

/** Esc hides the popover while the component is mounted. */
export function useEscapeHides() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ipc.hidePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
