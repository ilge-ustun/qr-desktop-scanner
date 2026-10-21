import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WifiCard } from "../components/WifiCard";
import type { WifiNetwork } from "../lib/payload";

afterEach(cleanup);

const home: WifiNetwork = { ssid: "Home", password: "secret123", security: "WPA", hidden: false };

const card = (network: WifiNetwork, join: () => Promise<void> = () => Promise.resolve()) => {
  const onCopy = vi.fn(() => Promise.resolve());
  const onJoin = vi.fn(join);
  render(<WifiCard network={network} onCopy={onCopy} onJoin={onJoin} onDismiss={() => {}} />);
  return { onCopy, onJoin };
};

describe("WifiCard", () => {
  it("hides the password until Show is clicked", () => {
    card(home);
    expect(screen.queryByText("secret123")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByText("secret123")).toBeTruthy();
  });

  it("copies the password, not the whole code", () => {
    const { onCopy } = card(home);
    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    expect(onCopy).toHaveBeenCalledWith("secret123");
  });

  it("connects only when Connect is clicked, and says when it worked", async () => {
    const { onJoin } = card(home);
    expect(onJoin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onJoin).toHaveBeenCalledWith("Home", "secret123");
    await waitFor(() => expect(screen.getByText("Connected to Home.")).toBeTruthy());
    expect((screen.getByRole("button", { name: "Connected" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows why a connection failed and lets you try again", async () => {
    card(home, () => Promise.reject("Failed to join network Home."));
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(screen.getByText(/Could not connect: Failed to join network Home\./)).toBeTruthy());
    expect((screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("has no password row or copy button for an open network", () => {
    card({ ssid: "Guest", password: "", security: "nopass", hidden: false });
    expect(screen.getByText("Wi-Fi · open network")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy password" })).toBeNull();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
  });
});
