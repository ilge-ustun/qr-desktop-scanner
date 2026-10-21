import { describe, expect, it } from "vitest";

import { classify } from "../lib/payload";

describe("classify", () => {
  it("treats web links as links", () => {
    expect(classify("https://example.com/menu?t=4")).toEqual({ kind: "url", text: "https://example.com/menu?t=4" });
  });

  it("keeps dangerous and app schemes as links so their warning is shown", () => {
    expect(classify("javascript:alert(1)").kind).toBe("url");
    expect(classify("otpauth://totp/Acme?secret=ABC").kind).toBe("url");
  });

  it("reads mailto as an email address without its query", () => {
    expect(classify("mailto:hi@example.com?subject=Hello")).toMatchObject({
      kind: "email",
      address: "hi@example.com",
    });
  });

  it("reads tel: as a phone number", () => {
    expect(classify("tel:+31201234567")).toMatchObject({ kind: "phone", number: "+31201234567" });
  });

  it("recognises Wi-Fi network codes", () => {
    expect(classify("WIFI:S:Home;T:WPA;P:secret;;").kind).toBe("wifi");
  });

  it("leaves prose and bare domains as text", () => {
    expect(classify("Note: call me later").kind).toBe("text");
    expect(classify("example.com").kind).toBe("text");
    expect(classify("hello world").kind).toBe("text");
  });

  it("trims surrounding whitespace", () => {
    expect(classify("  https://example.com \n").text).toBe("https://example.com");
  });
});
