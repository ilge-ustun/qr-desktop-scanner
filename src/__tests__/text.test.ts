// Story 016, AC1: afterPrefix.
import { describe, expect, it } from "vitest";

import { afterPrefix } from "../lib/text";

describe("AC1 afterPrefix", () => {
  it.each<[string, string, string, string | null]>([
    ["a match", "WIFI:S:Home;;", "WIFI:", "S:Home;;"],
    ["the case of the text is ignored", "wifi:S:Home;;", "WIFI:", "S:Home;;"],
    ["the case of the prefix is ignored", "MeCaRd:N:x", "mecard:", "N:x"],
    ["the rest keeps its case", "WIFI:S:Home", "wifi:", "S:Home"],
    ["an empty rest", "tel:", "tel:", ""],
    ["no match", "https://example.com", "WIFI:", null],
    ["a prefix longer than the text", "WIFI", "WIFI:", null],
    ["an empty text", "", "tel:", null],
    ["no trimming", " WIFI:S:x", "WIFI:", null],
    ["a longer scheme is a different scheme", "SMSTO:+31:Hi", "sms:", null],
    ["the prefix is text, not a pattern", "abc", "a.", null],
    ["dotless i is not I", "w\u0131fi:S:x", "WIFI:", null],
    ["long s is not s", "\u017Fms:+31", "sms:", null],
  ])("%s", (_pins, text, prefix, expected) => {
    expect(afterPrefix(text, prefix)).toBe(expected);
  });
});
