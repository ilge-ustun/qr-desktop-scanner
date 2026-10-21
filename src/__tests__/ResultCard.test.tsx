import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";
import type { Contact } from "../lib/contact";
import { F1, F2, F3, H1, M1, M1_CONTACT, V1, V1_CONTACT, V2 } from "./contactCodes";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const card = (text: string, copy: (text: string) => Promise<void> = () => Promise.resolve()) => {
  const onCopy = vi.fn(copy);
  const onOpen = vi.fn(() => Promise.resolve());
  const onJoin = vi.fn(() => Promise.resolve());
  const onDismiss = vi.fn();
  render(
    <ResultCard
      code={{ text, format: "qrcode" }}
      onCopy={onCopy}
      onOpen={onOpen}
      onJoin={onJoin}
      onDismiss={onDismiss}
    />,
  );
  return { onCopy, onOpen, onJoin, onDismiss };
};

describe("ResultCard", () => {
  it("shows a link's domain and opens it only when asked", () => {
    const { onOpen } = card("https://example.com/menu");
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith("https://example.com/menu");
  });

  it("copies the exact content", async () => {
    const { onCopy } = card("Table 12 · order at the bar");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith("Table 12 · order at the bar");
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
  });

  it("asks for a second look before opening a link with warnings", () => {
    const { onOpen } = card("http://bit.ly/3xQ9kLm");
    expect(screen.getByText("Link · check before opening")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open anyway" }));
    expect(onOpen).toHaveBeenCalledWith("http://bit.ly/3xQ9kLm");
  });

  it("has no Open button for a javascript: link, and warns, even with a space in it", () => {
    card("javascript:alert('QR test')");
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/Don't open it/);
  });

  it("has no Open button for plain text", () => {
    card("just some words");
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });

  it("shows a Wi-Fi code as a network to connect to", () => {
    const { onJoin } = card("WIFI:T:WPA;S:Home;P:secret;;");
    expect(screen.getByText("Home")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onJoin).toHaveBeenCalledWith("Home", "secret");
  });

  it("falls back to plain text for a Wi-Fi code without a network name", () => {
    card("WIFI:T:WPA;P:secret;;");
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("has a dismiss button on every kind of card", () => {
    for (const text of ["https://example.com", "WIFI:S:Home;P:pw;;", "plain words"]) {
      const { onDismiss } = card(text);
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onDismiss, text).toHaveBeenCalledOnce();
      cleanup();
    }
  });

  it("renders markup in the content as text", () => {
    card("<img src=x onerror=alert(1)>");
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("ResultCard, contacts", () => {
  it("AC2: gives a MECARD without a name (F3) the text card, whose one Copy copies the whole code", () => {
    const { onCopy, onOpen } = card(F3);
    expect(document.querySelector(".meta")?.textContent).toBe("Text");
    expect(document.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledExactlyOnceWith(F3);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("gives a vCard without END:VCARD (F1) or without a name (F2) the text card", () => {
    for (const code of [F1, F2]) {
      const { onCopy } = card(code);
      expect(document.querySelector(".meta")?.textContent, code).toBe("Text");
      expect(document.querySelectorAll("button"), code).toHaveLength(2);
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      expect(onCopy).toHaveBeenCalledExactlyOnceWith(code);
      cleanup();
    }
  });
});

// The named contacts of AC3 and AC4, and the values their cards list.
const NAMED: { code: string; contact: Contact }[] = [
  { code: V1, contact: V1_CONTACT },
  { code: M1, contact: M1_CONTACT },
];
const listed = (c: Contact) => [...c.phones, ...c.emails, ...c.organisations, ...c.websites];
const H1_VALUES = ["<img src=x onerror=alert(1)>", "<b>+31</b>"];

/** Each value is read from the code: mono text, never a button, a label or a link. */
const expectDecodedText = (values: string[]) => {
  for (const value of values) {
    for (const element of screen.getAllByText(value)) {
      expect(
        ["headline", "mono", "content"].some((name) => element.classList.contains(name)),
        `${value} in class "${element.className}"`,
      ).toBe(true);
      expect(element.closest("button, .meta"), value).toBeNull();
    }
    for (const element of document.querySelectorAll("button, .meta")) {
      expect(element.textContent, value).not.toContain(value);
    }
  }
};

describe("ResultCard, contact card", () => {
  it("AC3: the contact cards for V1 and M1 copy each listed value with its own button and offer nothing else", async () => {
    for (const { code, contact } of NAMED) {
      const { onCopy, onOpen } = card(code);
      expect(onCopy).not.toHaveBeenCalled();
      expect(onOpen).not.toHaveBeenCalled();
      expect(document.querySelector(".headline")?.textContent).toBe("Jane Doe");

      // The buttons are Dismiss plus Copy buttons, and nothing else.
      const buttons = Array.from(document.querySelectorAll("button"));
      const dismiss = screen.getByRole("button", { name: "Dismiss" });
      const copies = screen.getAllByRole("button", { name: /^Copy/ });
      expect(buttons).toHaveLength(copies.length + 1);
      expect(buttons.filter((b) => b !== dismiss && !copies.includes(b))).toEqual([]);

      copies.forEach((button, i) => {
        fireEvent.click(button);
        expect(onCopy).toHaveBeenCalledTimes(i + 1);
      });
      const copiedTexts = onCopy.mock.calls.map(([text]) => text);
      for (const value of listed(contact)) {
        expect(copiedTexts.filter((text) => text === value), value).toHaveLength(1);
      }
      for (const text of copiedTexts) expect([...listed(contact), contact.name]).toContain(text);
      expect(copiedTexts).not.toContain(code);
      expect(onOpen).not.toHaveBeenCalled();
      await screen.findByRole("button", { name: "Copied" });
      cleanup();
    }
  });

  it("AC4: on the cards for V1 and M1, decoded text is mono text and never a button, a label or a link", () => {
    for (const { code, contact } of NAMED) {
      card(code);
      expectDecodedText([contact.name, ...listed(contact)]);
      expect(document.querySelector("a")).toBeNull();
      cleanup();
    }
  });

  it("AC4: renders markup in a contact (H1) as text on the contact card", () => {
    card(H1);
    expect(document.querySelector(".headline")?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getAllByText("<img src=x onerror=alert(1)>", { exact: false }).length).toBeGreaterThan(0);
    expectDecodedText(H1_VALUES);
    expect(document.querySelector("a")).toBeNull();
  });

  it("says Copied on the clicked button only, moves it to the next one clicked, then says Copy again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { onCopy } = card(V1);
    const copies = screen.getAllByRole("button", { name: /^Copy/ });
    const labels = () => copies.map((b) => b.textContent);
    const before = labels();
    const copiedOn = (n: number) => before.map((label, i) => (i === n ? "Copied" : label));
    expect(before.filter((label) => label === "Copied")).toEqual([]);

    await act(async () => fireEvent.click(copies[2]));
    expect(labels()).toEqual(copiedOn(2));

    await act(async () => fireEvent.click(copies[0]));
    expect(labels()).toEqual(copiedOn(0));

    // A second click on the same button copies again and keeps Copied for
    // another 1.5 s.
    act(() => vi.advanceTimersByTime(1000));
    await act(async () => fireEvent.click(copies[0]));
    expect(onCopy).toHaveBeenCalledTimes(3);
    expect(onCopy).toHaveBeenLastCalledWith(V1_CONTACT.phones[0]);
    act(() => vi.advanceTimersByTime(1000));
    expect(labels()).toEqual(copiedOn(0));
    act(() => vi.advanceTimersByTime(500));
    expect(labels()).toEqual(before);
  });

  it("goes quietly when dismissed while a copy is still running", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let finish = () => {};
    card(V1, () => new Promise<void>((resolve) => (finish = resolve)));
    fireEvent.click(screen.getAllByRole("button", { name: /^Copy/ })[0]);
    cleanup();
    await act(async () => finish());
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("shows why a copy failed, and says Copied nowhere", async () => {
    card(V1, () => Promise.reject("Clipboard unavailable"));
    fireEvent.click(screen.getAllByRole("button", { name: /^Copy/ })[0]);
    await waitFor(() => expect(screen.getByText("Clipboard unavailable")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });

  it("copies the name with its own button", () => {
    const { onCopy } = card(V1);
    fireEvent.click(screen.getByRole("button", { name: "Copy name" }));
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("Jane Doe");
  });

  it("is dismissed with its ×", () => {
    const { onDismiss } = card(M1);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("shows a contact with only a name, and copies nothing but the name", () => {
    const { onCopy } = card("MECARD:N:Doe,Jane;;");
    expect(document.querySelector(".headline")?.textContent).toBe("Jane Doe");
    expect(document.querySelector(".meta")?.textContent).toBe("Contact");
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Dismiss",
      "Copy name",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Copy name" }));
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("Jane Doe");
  });

  it("keeps the line break in an organisation (V2)", () => {
    card(V2);
    const organisation = Array.from(document.querySelectorAll(".mono")).find((e) => e.textContent?.startsWith("Acme"));
    expect(organisation?.textContent).toBe("Acme\nLabs");
  });
});
