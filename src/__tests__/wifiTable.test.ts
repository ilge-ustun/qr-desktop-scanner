// Story 016, AC4: the Wi-Fi parser gives what it gave before it shared the
// backslash splitter. The values were read from the code on efdac6e, quirks
// included; they pin sameness, not correctness.
import { describe, expect, it } from "vitest";

import { classify } from "../lib/payload";
import { parseWifi, type WifiNetwork } from "../lib/wifi";

const net = (ssid: string, password = "", security = "", hidden = false): WifiNetwork => ({
  ssid,
  password,
  security,
  hidden,
});

const raw = String.raw;

/** [row, input, network]. The inputs hold raw characters: each \ is one backslash. */
const CODES: [string, string, WifiNetwork | null][] = [
  ["W1", "WIFI:T:WPA;S:Localhost;P:pass word;;", net("Localhost", "pass word", "WPA")],
  ["W2", raw`WIFI:S:My\;Net\:1;P:a\,b\\c\"d;T:WPA;;`, net("My;Net:1", 'a,b\\c"d', "WPA")],
  ["W3", "WIFI:S:Lab;P:a:b:c;;", net("Lab", "a:b:c")],
  ["W4", 'WIFI:S:"12345678";P:"pw";;', net("12345678", "pw")],
  ["W5", raw`WIFI:S:\"Home\";;`, net("Home")],
  ["W6", 'WIFI:S:";;', net('"')],
  ["W7", "WIFI:S:Home;P:pw", net("Home", "pw")],
  ["W8", "WIFI:S:Home;S", net("Home")],
  ["W9", "WIFI:S:Home;S;;", null],
  ["W10", "WIFI:S:Home;P:pw;P;;", net("Home")],
  ["W11", raw`WIFI:S:Real;S\:X:Home;;`, net("Real")],
  ["W12", raw`WIFI:S:a\\;b;`, net("a\\")],
  ["W13", "WIFI:S:Home\\", net("Home\\")],
  ["W14", "WIFI:S:Home;H:true;;", net("Home", "", "", true)],
  ["W15", 'WIFI:S:Home;H:"TRUE";;', net("Home", "", "", true)],
  ["W16", "WIFI:S:Home;H:1;;", net("Home")],
  ["W17", "wifi:s:Home;p:pw;t:wep;;", net("Home", "pw", "wep")],
  ["W18", "WIFI:\u017F:Home;;", net("Home")],
  ["W19", "WIFI: S:Home;;", null],
  ["W20", "WIFI:S:;;", null],
  ["W21", 'WIFI:S:"";;', null],
  ["W22", "WIFI:T:WPA;P:pw;;", null],
  ["W23", "WIFI:", null],
];

describe("AC4 the Wi-Fi codes parse as they did on efdac6e", () => {
  it.each(CODES)("%s parseWifi(%j)", (_row, input, network) => {
    expect(parseWifi(input)).toEqual(network);
  });

  it.each(CODES)("%s classify(%j) carries the same result", (_row, input, network) => {
    expect(classify(input)).toEqual({ kind: "wifi", text: input, network });
  });

  it.each([
    ["W24", "https://example.com"],
    ["W25", " WIFI:S:Home;;"],
    ["W26", "w\u0131fi:S:Home;;"],
  ])("%s parseWifi(%j) is null", (_row, input) => {
    expect(parseWifi(input)).toBeNull();
  });

  it("W26 classifies as text", () => {
    const input = "w\u0131fi:S:Home;;";
    expect(classify(input)).toEqual({ kind: "text", text: input });
  });
});
