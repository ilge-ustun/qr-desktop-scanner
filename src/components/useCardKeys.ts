import { useEffect, useEffectEvent, useRef } from "react";

import { cardKey, type CardKeys } from "../lib/cardKeys";

/** Marks the element of a result card that answers keys. */
const CARD = "[data-card-keys]";

/** The card a key acts on: the one holding focus, else the first one shown. */
function cardFor(target: EventTarget | null): Element | null {
  return (target instanceof Element && target.closest(CARD)) || document.querySelector(CARD);
}

/** A control Enter presses by itself. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a[href], input, select, textarea") !== null;
}

/**
 * Lets a result card answer Enter, ⌘O and ⌘J by running `keys.copy`,
 * `keys.open` and `keys.join`: what its own buttons run, so a key does what a
 * click does, feedback included. A key acts on one card, the one holding focus,
 * else the first. Spread the result on the card's element.
 */
export function useCardKeys(keys: CardKeys) {
  const ref = useRef<HTMLElement>(null);
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const key = cardKey(e);
    if (!key || cardFor(e.target) !== ref.current) return;
    // Enter on a focused button presses that button, and nothing else.
    if (key === "copy" && isControl(e.target)) return;
    const run = keys[key];
    if (!run) return;
    e.preventDefault();
    run();
  });
  useEffect(() => {
    // Bubble phase on window: while the shortcut chip records, its capture
    // listener stops every key before it gets here.
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return { ref, "data-card-keys": "" };
}
