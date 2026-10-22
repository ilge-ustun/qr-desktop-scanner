import { describe, expect, it } from "vitest";

import { linkMeta, toneOf, type Tone, type Warning } from "../lib/urlSafety";

// Only the severity matters; the code and the message are any strings.
const caution: Warning = { code: "a", severity: "caution", message: "A caution." };
const danger: Warning = { code: "b", severity: "danger", message: "A danger." };

describe("AC2 toneOf: the link card's tone from its warnings", () => {
  it.each<[string, string, Tone, Warning[]]>([
    ["T1", "[]", "ok", []],
    ["T2", "[caution]", "warn", [caution]],
    ["T3", "[caution, caution]", "warn", [caution, caution]],
    ["T4", "[danger]", "danger", [danger]],
    ["T5", "[caution, danger]", "danger", [caution, danger]],
    ["T6", "[danger, caution]", "danger", [danger, caution]],
  ])("%s: %s gives %j", (_, __, tone, warnings) => {
    expect(toneOf(warnings)).toBe(tone);
  });
});

describe("AC2 linkMeta: the link card's label from its tone", () => {
  it.each<[string, string, Tone, string]>([
    ["M1", "Link", "ok", "Link"],
    ["M2", "Link", "warn", "Link · check before opening"],
    ["M3", "Link", "danger", "Link · check before opening"],
    ["M4", "Email", "warn", "Email · check before opening"],
    ["M5", "Text", "ok", "Text"],
  ])("%s: (%j, %j) gives %j", (_, label, tone, meta) => {
    expect(linkMeta(label, tone)).toBe(meta);
  });
});
