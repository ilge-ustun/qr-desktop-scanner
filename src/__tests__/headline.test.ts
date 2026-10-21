import { describe, expect, it } from "vitest";

import { headlineSize } from "../lib/headline";

describe("headlineSize", () => {
  it("keeps short names big and shrinks long ones", () => {
    expect(headlineSize("bit.ly")).toBe("l");
    expect(headlineSize("Studio Guest")).toBe("l");
    expect(headlineSize("menu.example.com")).toBe("m");
    expect(headlineSize("espirito2026.netlify.app")).toBe("s");
  });
});
