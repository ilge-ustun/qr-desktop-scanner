import { describe, expect, it } from "vitest";

import { parseWifi, wifiMeta, type WifiNetwork } from "../lib/wifi";

describe("AC3 (a) parseWifi", () => {
  it("reads name, password and security in any order", () => {
    expect(parseWifi("WIFI:T:WPA;S:Localhost;P:pass word;;")).toEqual({
      ssid: "Localhost",
      password: "pass word",
      security: "WPA",
      hidden: false,
    });
    expect(parseWifi("WIFI:S:Home;P:pw;T:WEP;H:true;;")).toMatchObject({ security: "WEP", hidden: true });
  });

  it("unescapes backslash-escaped characters in values", () => {
    expect(parseWifi(String.raw`WIFI:S:My\;Net\:1;P:a\,b\\c\"d;T:WPA;;`)).toMatchObject({
      ssid: "My;Net:1",
      password: 'a,b\\c"d',
    });
  });

  it("keeps a colon in a value", () => {
    expect(parseWifi("WIFI:S:Lab;P:a:b:c;;")?.password).toBe("a:b:c");
  });

  it("strips the quotes some generators put around values", () => {
    expect(parseWifi('WIFI:S:"12345678";P:"pw";;')).toMatchObject({ ssid: "12345678", password: "pw" });
  });

  it("treats a missing password and type as an open network", () => {
    expect(parseWifi("WIFI:S:Guest;;")).toEqual({ ssid: "Guest", password: "", security: "", hidden: false });
  });

  it("tolerates a missing final ;;", () => {
    expect(parseWifi("WIFI:S:Home;P:pw")).toMatchObject({ ssid: "Home", password: "pw" });
  });

  it("returns null without a network name", () => {
    expect(parseWifi("WIFI:T:WPA;P:pw;;")).toBeNull();
    expect(parseWifi("https://example.com")).toBeNull();
  });
});

describe("AC3 (b) wifiMeta: the Wi-Fi card's label", () => {
  const network = (security: string, hidden = false): WifiNetwork => ({ ssid: "Home", password: "pw", security, hidden });

  it.each([
    ["W1", "WPA", false, "Wi-Fi · WPA/WPA2"],
    ["W2", "wpa", false, "Wi-Fi · WPA/WPA2"],
    ["W3", "WPA2", false, "Wi-Fi · WPA2"],
    ["W4", "WPA3", false, "Wi-Fi · WPA3"],
    ["W5", "SAE", false, "Wi-Fi · WPA3"],
    ["W6", "WEP", false, "Wi-Fi · WEP"],
    ["W7", "nopass", false, "Wi-Fi · open network"],
    ["W8", "", false, "Wi-Fi · open network"],
    ["W9", "WPA2-EAP", false, "Wi-Fi · WPA2-EAP"],
    ["W10", "constructor", false, "Wi-Fi · constructor"],
    ["W11", "WPA", true, "Wi-Fi · WPA/WPA2 · hidden"],
    ["W12", "", true, "Wi-Fi · open network · hidden"],
  ])("%s: security %j, hidden %s, gives %j", (_, security, hidden, meta) => {
    expect(wifiMeta(network(security, hidden))).toBe(meta);
  });
});
