// Story 016, AC3: one classify call tests each prefix at most once, and each
// of the seven on its own path exactly once. afterPrefix is the real one, in
// a spy, so classify still gives real results.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { classify } from "../lib/payload";
import { afterPrefix } from "../lib/text";

vi.mock("../lib/text", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/text")>();
  return { ...actual, afterPrefix: vi.fn(actual.afterPrefix) };
});

const SEVEN = ["MAILTO:", "TEL:", "SMS:", "SMSTO:", "GEO:", "WIFI:", "MECARD:"];

function prefixesTested(input: string): string[] {
  vi.mocked(afterPrefix).mockClear();
  classify(input);
  return vi.mocked(afterPrefix).mock.calls.map((call) => call[1].toUpperCase());
}

const count = (list: string[], item: string) => list.filter((p) => p === item).length;

const INPUTS = [
  "mailto:a@example.com",
  "tel:+31",
  "sms:+31?body=Hi",
  "SMSTO:+31:Hi",
  "geo:52.37,4.89",
  "WIFI:S:Home;;",
  "wifi:S:Home;;",
  "WIFI:",
  "MECARD:N:Doe,Jane;;",
  "mecard:N:Doe,Jane;;",
  "MECARD:TEL:+31;;",
  "https://example.com",
  "hello world",
];

describe("AC3 classify tests a prefix once", () => {
  beforeEach(() => {
    vi.mocked(afterPrefix).mockClear();
  });

  it.each(INPUTS)("%j: no prefix twice", (input) => {
    const tested = prefixesTested(input);
    for (const prefix of new Set(tested)) expect(count(tested, prefix), prefix).toBe(1);
  });

  it.each(INPUTS.filter((input) => SEVEN.some((p) => input.toUpperCase().startsWith(p))))(
    "%j: its own prefix is tested",
    (input) => {
      const tested = prefixesTested(input);
      const own = SEVEN.filter((p) => input.toUpperCase().startsWith(p));
      // SMS: is not the prefix of an SMSTO: code.
      const exact = own.filter((p) => !(p === "SMS:" && input.toUpperCase().startsWith("SMSTO:")));
      expect(exact.length).toBeGreaterThan(0);
      for (const prefix of exact) expect(count(tested, prefix), prefix).toBe(1);
    },
  );

  it.each(["https://example.com", "hello world"])("%j: each of the seven is tested", (input) => {
    const tested = prefixesTested(input);
    for (const prefix of SEVEN) expect(count(tested, prefix), prefix).toBe(1);
  });
});
