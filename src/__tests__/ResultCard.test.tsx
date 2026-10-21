import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";
import type { Contact } from "../lib/contact";
import { F1, F2, F3, H1, M1, M1_CONTACT, V1, V1_CONTACT, V2 } from "./contactCodes";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const card = (
  text: string,
  copy: (text: string) => Promise<void> = () => Promise.resolve(),
  open: (url: string) => Promise<void> = () => Promise.resolve(),
) => {
  const onCopy = vi.fn(copy);
  const onOpen = vi.fn(open);
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

// Story 002: phone, SMS and geo codes.
const P1 = "tel:+31201234567";
const S1 = "sms:+31201234567?body=Running%20late%3A%2010%20min";
const S2 = "SMSTO:+31201234567:Running late: 10 min";
const S3 = "sms:+31201234567";
const S4a = "sms:+31201234567?body=100%";
const S4b = "sms:+31201234567?body=%E0%A4%A";
const G1 = "geo:52.3731,4.8922";
const G2 = "geo:52.3731,4.8922;u=35";
const G3 = "geo:-33.8568,151.2153?q=Opera%20House";
const G4 = "geo:90,-180";
const G5 = "geo:52.3731,4.8922,10";
const X1 = "geo:90.0001,0";
const X2 = "geo:0,180.5";
const X3 = "geo:,4.8922";
const X4 = "geo:0x10,5";
const X5 = "geo:1e1,5";
const X6 = "geo:52.3731";
const X7 = "geo:52.3731,4.8922&q=x";
const A1 = "geo:0,0?q=Rijksmuseum%20Amsterdam";
const H2 = "SMSTO:+31201234567:<img src=x onerror=alert(1)>";
const H3 = "geo:<img src=x onerror=alert(1)>";
const NUMBER = "+31201234567";
const MARKUP = "<img src=x onerror=alert(1)>";

/** The Copy buttons, collected before any click (a clicked one may then read
 * Copied), each with its value: the text of the one element its
 * aria-describedby names. */
const copyButtons = (code: string) =>
  screen.queryAllByRole("button", { name: /^Copy/ }).map((button) => {
    const ids = (button.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    expect(ids, `${code}: ${button.textContent} describedby`).toHaveLength(1);
    const target = document.getElementById(ids[0]);
    expect(target, `${code}: ${button.textContent} value`).not.toBeNull();
    return { button, value: target?.textContent ?? "" };
  });

type Copies = ReturnType<typeof copyButtons>;

/** The buttons are one Dismiss, the Copy buttons and one button per name in
 * `others`, and nothing else. */
const expectButtons = (code: string, copies: Copies, others: string[] = []) => {
  const dismiss = screen.getAllByRole("button", { name: "Dismiss" });
  expect(dismiss, code).toHaveLength(1);
  const named = others.map((name) => {
    const buttons = screen.getAllByRole("button", { name });
    expect(buttons, `${code}: ${name}`).toHaveLength(1);
    return buttons[0];
  });
  const expected = [...dismiss, ...copies.map(({ button }) => button), ...named];
  const buttons = Array.from(document.querySelectorAll("button"));
  expect(buttons, code).toHaveLength(expected.length);
  for (const button of buttons) expect(expected, `${code}: ${button.textContent}`).toContain(button);
};

/** The card copies every value in `required`, and may also copy those in
 * `optional`: each Copy button copies exactly its own value, once per click,
 * and nothing else is copied. */
const expectCopies = async (
  code: string,
  onCopy: ReturnType<typeof card>["onCopy"],
  copies: Copies,
  required: string[],
  optional: string[] = [],
) => {
  for (const [i, { button, value }] of copies.entries()) {
    await act(async () => fireEvent.click(button));
    expect(onCopy, `${code}: click ${i + 1}`).toHaveBeenCalledTimes(i + 1);
    expect(onCopy, `${code}: click ${i + 1}`).toHaveBeenLastCalledWith(value);
  }
  const values = copies.map(({ value }) => value);
  for (const value of required) expect(values, `${code} copies`).toContain(value);
  for (const value of values) expect([...required, ...optional], `${code} copies nothing else`).toContain(value);
};

describe("ResultCard, phone card", () => {
  it("002 AC1: the phone card for P1 copies the number only, does not print the raw code, and offers nothing but Copy", async () => {
    const { onCopy, onOpen } = card(P1);
    expect(document.body.textContent).not.toContain("tel:");
    const copies = copyButtons(P1);
    expectButtons(P1, copies);
    await expectCopies(P1, onCopy, copies, [NUMBER]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("gives tel: without a number the card it got before", () => {
    const { onCopy } = card("tel:");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("tel:");
  });
});

const SMS_CARDS: [string, string[]][] = [
  [S1, [NUMBER, "Running late: 10 min"]],
  [S2, [NUMBER, "Running late: 10 min"]],
  [S3, [NUMBER]],
  [S4a, [NUMBER, "100%"]],
  [S4b, [NUMBER, "%E0%A4%A"]],
  [H2, [NUMBER, MARKUP]],
];

describe("ResultCard, SMS card", () => {
  it("002 AC2: the SMS cards for S1, S2, S3, S4a, S4b and H2 copy the number and the message, each with its own Copy, and offer nothing else", async () => {
    for (const [code, required] of SMS_CARDS) {
      const { onCopy, onOpen } = card(code);
      const copies = copyButtons(code);
      expectButtons(code, copies);
      await expectCopies(code, onCopy, copies, required);
      expect(onOpen, code).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("says Copied on the clicked button only, then Copy again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    card(S1);
    const copies = screen.getAllByRole("button", { name: /^Copy/ });
    const before = copies.map((b) => b.textContent);
    await act(async () => fireEvent.click(copies[0]));
    expect(copies.map((b) => b.textContent)).toEqual(before.map((label, i) => (i === 0 ? "Copied" : label)));
    act(() => vi.advanceTimersByTime(1500));
    expect(copies.map((b) => b.textContent)).toEqual(before);
  });

  it("shows why a copy failed", async () => {
    card(S1, () => Promise.reject("Clipboard unavailable"));
    fireEvent.click(screen.getAllByRole("button", { name: /^Copy/ })[0]);
    await waitFor(() => expect(screen.getByText("Clipboard unavailable")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });
});

const MAPS = "https://maps.apple.com/?ll=";
const MAPS_CARDS: { code: string; required: string[]; optional: string[]; link: string }[] = [
  { code: G1, required: ["52.3731,4.8922"], optional: [], link: `${MAPS}52.3731,4.8922` },
  { code: G2, required: ["52.3731,4.8922"], optional: [], link: `${MAPS}52.3731,4.8922` },
  { code: G3, required: ["-33.8568,151.2153"], optional: ["Opera House"], link: `${MAPS}-33.8568,151.2153` },
  { code: G4, required: ["90,-180"], optional: [], link: `${MAPS}90,-180` },
  { code: G5, required: ["52.3731,4.8922,10"], optional: [], link: `${MAPS}52.3731,4.8922` },
];

const PLAIN_GEO_CARDS: [string, string[], string[]][] = [
  [X1, ["90.0001,0"], []],
  [X2, ["0,180.5"], []],
  [X3, [",4.8922"], []],
  [X4, ["0x10,5"], []],
  [X5, ["1e1,5"], []],
  [X6, ["52.3731"], []],
  [X7, ["52.3731,4.8922&q=x"], []],
  [A1, ["Rijksmuseum Amsterdam"], ["0,0"]],
  [H3, [MARKUP], []],
];

describe("ResultCard, geo card", () => {
  it("002 AC3: the geo cards for G1-G5 copy the coordinates as written, and offer Open in Maps, which opens exactly the ll link and only on a click", async () => {
    for (const { code, required, optional, link } of MAPS_CARDS) {
      const { onCopy, onOpen } = card(code);
      expect(onOpen, code).not.toHaveBeenCalled();
      expect(document.querySelector("a"), code).toBeNull();
      const copies = copyButtons(code);
      expectButtons(code, copies, ["Open in Maps"]);
      await expectCopies(code, onCopy, copies, required, optional);
      expect(onOpen, code).not.toHaveBeenCalled();
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Open in Maps" })));
      expect(onOpen, code).toHaveBeenCalledExactlyOnceWith(link);
      cleanup();
    }
  });

  it("002 AC4: the geo cards for X1-X7, A1 and H3 copy what the code says and offer no Open in Maps", async () => {
    for (const [code, required, optional] of PLAIN_GEO_CARDS) {
      const { onCopy, onOpen } = card(code);
      const copies = copyButtons(code);
      expectButtons(code, copies);
      await expectCopies(code, onCopy, copies, required, optional);
      expect(onOpen, code).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("opens Maps once per click", async () => {
    const { onOpen } = card(G1);
    const open = screen.getByRole("button", { name: "Open in Maps" });
    await act(async () => fireEvent.click(open));
    await act(async () => fireEvent.click(open));
    expect(onOpen.mock.calls).toEqual([[`${MAPS}52.3731,4.8922`], [`${MAPS}52.3731,4.8922`]]);
  });

  it("shows why Maps did not open", async () => {
    card(G1, undefined, () => Promise.reject("Only http, https and mailto links can be opened"));
    fireEvent.click(screen.getByRole("button", { name: "Open in Maps" }));
    await waitFor(() => expect(screen.getByText("Only http, https and mailto links can be opened")).toBeTruthy());
  });

  it("goes quietly when dismissed while Maps is still opening", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = () => {};
    card(G1, undefined, () => new Promise<void>((_, reject) => (fail = () => reject("too late"))));
    fireEvent.click(screen.getByRole("button", { name: "Open in Maps" }));
    cleanup();
    await act(async () => fail());
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps the coordinates of a code with a place whose coordinates are not valid", () => {
    card("geo:999,0?q=Dam");
    expect(screen.getByText("999,0")).toBeTruthy();
    expect(screen.getByText("Dam")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open in Maps" })).toBeNull();
  });
});

describe("ResultCard, phone, SMS and geo cards", () => {
  it("copy each its own value with two cards on screen", async () => {
    const { onCopy } = card(S1);
    card(G3);
    const copies = copyButtons("S1 and G3");
    expect(copies.map(({ value }) => value)).toEqual([
      "Running late: 10 min",
      NUMBER,
      "-33.8568,151.2153",
      "Opera House",
    ]);
    await expectCopies("S1 and G3", onCopy, copies.slice(0, 2), [NUMBER, "Running late: 10 min"]);
  });

  it("are dismissed with their ×, which copies and opens nothing", () => {
    for (const code of [P1, S1, G1, X1]) {
      const { onDismiss, onCopy, onOpen } = card(code);
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onDismiss, code).toHaveBeenCalledOnce();
      expect(onCopy, code).not.toHaveBeenCalled();
      expect(onOpen, code).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("002 AC5: on the cards for P1, S1, G3, A1, H2 and H3, decoded text is mono text and never a button, a label, a link or markup", () => {
    const decoded: [string, string[]][] = [
      [P1, [NUMBER]],
      [S1, [NUMBER, "Running late: 10 min"]],
      [G3, ["-33.8568,151.2153"]],
      [A1, ["Rijksmuseum Amsterdam"]],
      [H2, [NUMBER, MARKUP]],
      [H3, [MARKUP]],
    ];
    for (const [code, values] of decoded) {
      card(code);
      expectDecodedText(values);
      expect(document.querySelector("a"), code).toBeNull();
      if (code === H2 || code === H3) expect(document.querySelector("img"), code).toBeNull();
      cleanup();
    }
  });
});
