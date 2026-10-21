import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";

afterEach(cleanup);

const card = (text: string) => {
  const onCopy = vi.fn(() => Promise.resolve());
  const onOpen = vi.fn(() => Promise.resolve());
  render(<ResultCard code={{ text, format: "qrcode" }} onCopy={onCopy} onOpen={onOpen} />);
  return { onCopy, onOpen };
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
    const { onCopy } = card("WIFI:S:Home;T:WPA;P:secret;;");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith("WIFI:S:Home;T:WPA;P:secret;;");
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
  });

  it("has no Open button for a javascript: link, and warns", () => {
    card("javascript:alert(1)");
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/Don't open it/);
  });

  it("has no Open button for plain text", () => {
    card("just some words");
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });

  it("renders markup in the content as text", () => {
    card("<img src=x onerror=alert(1)>");
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
  });
});
