// Story 016, AC6: queryParam matches a name in either case.
import { describe, expect, it } from "vitest";

import { queryParam } from "../lib/query";

describe("AC6 queryParam", () => {
  it.each([
    ["Body=x", "BODY", "x"],
    ["body=x", "BoDy", "x"],
    ["BODY=Hi%20There", "body", "Hi There"],
    ["q=1&Q=2", "Q", "1"],
    ["body=x", "q", null],
  ])("queryParam(%j, %j) is %j", (query, name, expected) => {
    expect(queryParam(query, name)).toBe(expected);
  });
});
