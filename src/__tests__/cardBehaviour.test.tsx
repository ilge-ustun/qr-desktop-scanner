// Story 013: the link, phone and Wi-Fi cards give the same copy feedback.
// Copied lasts 1.5 s from the last copy, and a failed copy says why, on the
// Wi-Fi card too. onCopy is mocked: the real clipboard is not exercised.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const FAILURE = "Clipboard unavailable";
const NOT_OPENED = "Only http, https and mailto links can be opened";

type Row = { name: string; code: string; button: string; value: string };

const ROWS: Row[] = [
  { name: "link", code: "https://example.com/menu", button: "Copy", value: "https://example.com/menu" },
  { name: "phone", code: "tel:+31201234567", button: "Copy number", value: "+31201234567" },
  { name: "Wi-Fi", code: "WIFI:T:WPA;S:Home;P:secret;;", button: "Copy password", value: "secret" },
];

function card(code: string, open: (url: string) => Promise<void> = () => Promise.resolve()) {
  const onCopy = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
  const onOpen = vi.fn(open);
  render(
    <ResultCard
      code={{ text: code, format: "qrcode" }}
      onCopy={onCopy}
      onOpen={onOpen}
      onJoin={vi.fn(() => Promise.resolve())}
      onDismiss={vi.fn()}
    />,
  );
  const cards = document.querySelectorAll(".card");
  expect(cards).toHaveLength(1);
  return { onCopy, card: cards[0] };
}

const click = (button: HTMLElement) => act(async () => fireEvent.click(button));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** The card's p.failure children. */
const failures = (card: Element) => card.querySelectorAll(":scope > p.failure");

for (const { name, code, button: label, value } of ROWS) {
  describe(`AC1 ${name} card`, () => {
    it("(a) says Copied for 1500 ms after one copy, then its label again", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { onCopy } = card(code);
      const button = screen.getByRole("button", { name: label });
      await click(button);
      expect(onCopy).toHaveBeenCalledExactlyOnceWith(value);
      expect(button.textContent).toBe("Copied");
      wait(1499);
      expect(button.textContent).toBe("Copied");
      wait(1);
      expect(button.textContent).toBe(label);
    });

    it("(b) a second copy restarts the timer: Copied lasts 1500 ms from the last copy", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { onCopy } = card(code);
      const button = screen.getByRole("button", { name: label });
      await click(button);
      wait(1000);
      await click(button);
      expect(onCopy).toHaveBeenCalledTimes(2);
      wait(1499);
      expect(button.textContent).toBe("Copied");
      wait(1);
      expect(button.textContent).toBe(label);
    });

    it("(c) a failed copy shows its reason before the actions and says Copied nowhere, (d) a later copy clears it", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { onCopy, card: element } = card(code);
      onCopy.mockImplementationOnce(() => Promise.reject(FAILURE));
      const button = screen.getByRole("button", { name: label });

      await click(button);
      const failure = failures(element);
      expect(failure).toHaveLength(1);
      expect(failure[0].textContent).toBe(FAILURE);
      const actions = element.querySelector(":scope > .actions");
      expect(actions).not.toBeNull();
      expect(failure[0].compareDocumentPosition(actions!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(Array.from(element.querySelectorAll("button"), (b) => b.textContent)).not.toContain("Copied");

      await click(button);
      expect(onCopy).toHaveBeenCalledTimes(2);
      expect(element.querySelector("p.failure")).toBeNull();
      expect(button.textContent).toBe("Copied");
    });
  });
}

describe("AC1 link card", () => {
  it("(e) shows why Open failed", async () => {
    const { card: element } = card("https://example.com/menu", () => Promise.reject(NOT_OPENED));
    await click(screen.getByRole("button", { name: "Open" }));
    expect(Array.from(failures(element), (p) => p.textContent)).toEqual([NOT_OPENED]);
  });
});
