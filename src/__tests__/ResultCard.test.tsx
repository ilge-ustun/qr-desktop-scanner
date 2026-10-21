import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";
import { F3 } from "./contactCodes";

afterEach(cleanup);

const card = (text: string) => {
  const onCopy = vi.fn(() => Promise.resolve());
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
});
