import { useEffect, type RefObject } from "react";

import * as ipc from "../lib/ipc";

/** The window is as tall as what it shows: Rust resizes it whenever the
 * content's height changes (bounded there, with the rest scrolling here). */
export function useFitPopover(popover: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = popover.current;
    if (!element) return;
    // + the offset shadow printed below and right of the popover (styles.css).
    const observer = new ResizeObserver(() => void ipc.fitPopover(Math.ceil(element.offsetHeight) + 6));
    observer.observe(element);
    return () => observer.disconnect();
  }, [popover]);
}
