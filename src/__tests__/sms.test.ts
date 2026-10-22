import { describe, expect, it } from "vitest";

import { parseSms } from "../lib/sms";

describe("parseSms, sms: (RFC 5724)", () => {
  it("reads the number up to ? and the percent-decoded body", () => {
    expect(parseSms("sms:+31201234567?body=Running%20late%3A%2010%20min")).toEqual({
      number: "+31201234567",
      message: "Running late: 10 min",
    });
  });

  it("has no message without a body", () => {
    expect(parseSms("sms:+31201234567")).toEqual({ number: "+31201234567", message: "" });
    expect(parseSms("sms:+31201234567?")).toEqual({ number: "+31201234567", message: "" });
    expect(parseSms("sms:+31201234567?subject=x")).toEqual({ number: "+31201234567", message: "" });
  });

  it("finds the body among other parameters", () => {
    expect(parseSms("sms:+31?x=1&body=Hi%21&y=2")?.message).toBe("Hi!");
  });

  it("keeps a body that is not valid percent-encoding exactly as written, and never throws", () => {
    expect(parseSms("sms:+31201234567?body=100%")?.message).toBe("100%");
    expect(parseSms("sms:+31201234567?body=%E0%A4%A")?.message).toBe("%E0%A4%A");
    expect(parseSms("sms:+31?body=%FF")?.message).toBe("%FF");
  });

  it("keeps markup in the body as text", () => {
    expect(parseSms("sms:+31?body=%3Cb%3Ehi%3C%2Fb%3E")?.message).toBe("<b>hi</b>");
  });

  it("reads the prefix in any case", () => {
    expect(parseSms("SMS:+31?body=Hi")).toEqual({ number: "+31", message: "Hi" });
  });

  it("does not parse without a number", () => {
    expect(parseSms("sms:")).toBeNull();
    expect(parseSms("sms:?body=Hi")).toBeNull();
    expect(parseSms("sms: ?body=Hi")).toBeNull();
  });
});

describe("parseSms, SMSTO:number:message", () => {
  it("reads the number up to the first colon and keeps every colon after it", () => {
    expect(parseSms("SMSTO:+31201234567:Running late: 10 min")).toEqual({
      number: "+31201234567",
      message: "Running late: 10 min",
    });
    expect(parseSms("SMSTO:+31:a:b::c")?.message).toBe("a:b::c");
  });

  it("does not percent-decode the message", () => {
    expect(parseSms("SMSTO:+31:100%20")?.message).toBe("100%20");
  });

  it("has no message without one", () => {
    expect(parseSms("SMSTO:+31201234567")).toEqual({ number: "+31201234567", message: "" });
    expect(parseSms("SMSTO:+31201234567:")).toEqual({ number: "+31201234567", message: "" });
  });

  it("keeps markup in the message as text", () => {
    expect(parseSms("SMSTO:+31201234567:<img src=x onerror=alert(1)>")?.message).toBe(
      "<img src=x onerror=alert(1)>",
    );
  });

  it("reads the prefix in any case", () => {
    expect(parseSms("smsto:+31:Hi")).toEqual({ number: "+31", message: "Hi" });
  });

  it("does not parse without a number", () => {
    expect(parseSms("SMSTO:")).toBeNull();
    expect(parseSms("SMSTO::Hi")).toBeNull();
  });
});

describe("parseSms, other codes", () => {
  it("does not read other codes", () => {
    expect(parseSms("tel:+31201234567")).toBeNull();
    expect(parseSms("https://example.com/sms:+31")).toBeNull();
    expect(parseSms("SMSTOX:+31:Hi")).toBeNull();
  });
});
