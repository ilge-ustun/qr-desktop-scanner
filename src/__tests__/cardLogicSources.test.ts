// Story 014: the rules that decide what a card shows are in src/lib, where a
// test reaches them without rendering a card. These tests read the source of
// src/components and src/lib as text, comments removed. They prove where a
// rule is written, not that it is right: a rule written again under other
// names goes unseen, and the reviewer reads the diff for that.
import { describe, expect, it } from "vitest";

import { imports, matches, sources, type Source } from "./sourceText";

/** Every .ts and .tsx file under src/components/ and src/lib/, as text. No
 * type argument: vitest caches a transformed file on disk unless its text
 * holds "import.meta.glob(", and a cached copy would miss a file added since. */
const DOMAIN: Record<string, string> = import.meta.glob(["/src/components/**/*.{ts,tsx}", "/src/lib/**/*.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const RESULT_CARD = "/src/components/ResultCard.tsx";
const WIFI_CARD = "/src/components/WifiCard.tsx";
const FIELD_CARD = "/src/components/FieldCard.tsx";
const PAYLOAD = "/src/lib/payload.ts";
const URL_SAFETY = "/src/lib/urlSafety.ts";
const WIFI = "/src/lib/wifi.ts";

const SOURCES = sources(DOMAIN);

describe("the files the source tests read", () => {
  it("are every .ts and .tsx file under src/components/ and src/lib/, the cards and their rules among them", () => {
    const files = Object.keys(DOMAIN);
    for (const file of [RESULT_CARD, WIFI_CARD, FIELD_CARD, PAYLOAD, URL_SAFETY, WIFI]) {
      expect(files).toContain(file);
    }
    expect(files.filter((f) => !/^\/src\/(components|lib)\/.+\.tsx?$/.test(f))).toEqual([]);
  });
});

/** What AC3 (c) finds. */
function wifiModule(all: Source[]) {
  return {
    payloadImportsWifi: imports(all, PAYLOAD, WIFI),
    payloadParser: [/\bfunction\s+parseWifi\b/, /\bunquote\b/, /\binValue\b/].map(
      (p) => matches(all, p)[PAYLOAD] ?? 0,
    ),
    wifiNetworkTypes: matches(all, /\btype\s+WifiNetwork\s*=/),
  };
}

describe("AC3 (c) the Wi-Fi parser lives in src/lib/wifi.ts, and payload.ts takes it from there", () => {
  it("payload.ts imports wifi.ts and holds no parser of its own", () => {
    const found = wifiModule(SOURCES);
    expect(found.payloadImportsWifi).toBe(true);
    expect(found.payloadParser).toEqual([0, 0, 0]);
  });

  it("type WifiNetwork = is written once, in wifi.ts", () => {
    expect(wifiModule(SOURCES).wifiNetworkTypes).toEqual({ [WIFI]: 1 });
  });
});
