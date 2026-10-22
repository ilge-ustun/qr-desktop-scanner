import { describe, expect, it } from "vitest";

import { linkMeta, toneOf, type Tone, type Warning } from "../lib/urlSafety";

// Only the severity matters; the code and the message are any strings.
const caution: Warning = { code: "a", severity: "caution", message: "A caution." };
const danger: Warning = { code: "b", severity: "danger", message: "A danger." };

describe("AC2 toneOf: the link card's tone from its warnings", () => {
  it.each<[string, string, Warning[], Tone]>([
    ["T1", "[]", [], "ok"],
    ["T2", "[caution]", [caution], "warn"],
    ["T3", "[caution, caution]", [caution, caution], "warn"],
    ["T4", "[danger]", [danger], "danger"],
    ["T5", "[caution, danger]", [caution, danger], "danger"],
    ["T6", "[danger, caution]", [danger, caution], "danger"],
  ])("%s: %s gives %j", (_, __, warnings, tone) => {
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
