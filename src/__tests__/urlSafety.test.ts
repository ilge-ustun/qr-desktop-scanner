import { describe, expect, it } from "vitest";

import { assess } from "../lib/urlSafety";

const codes = (text: string) => assess(text).warnings.map((w) => w.code);

describe("assess", () => {
  it("lets a plain https link open with no warnings and shows its host", () => {
    expect(assess("https://www.example.com/path")).toEqual({
      domain: "www.example.com",
      openable: true,
      warnings: [],
    });
  });

  it("never offers Open for script, data or file links", () => {
    for (const text of [
      "javascript:alert(1)",
      "javascript:alert('QR test')",
      "data:text/html,<b>hi</b>",
      "file:///etc/passwd",
    ]) {
      const result = assess(text);
      expect(result.openable, text).toBe(false);
      expect(codes(text), text).toEqual(["dangerous-scheme"]);
    }
  });

  it("does not open links into other apps", () => {
    expect(assess("slack://open?team=T1")).toMatchObject({ openable: false });
    expect(codes("slack://open?team=T1")).toEqual(["app-scheme"]);
  });

  it("allows mailto", () => {
    expect(assess("mailto:hi@example.com").openable).toBe(true);
  });

  it("warns on plain http", () => {
    expect(codes("http://example.com")).toEqual(["not-encrypted"]);
    expect(assess("http://example.com").openable).toBe(true);
  });

  it("flags look-alike hostnames, typed in Unicode or punycode", () => {
    expect(codes("https://аpple.com")).toContain("look-alike"); // Cyrillic а
    expect(codes("https://xn--pple-43d.com")).toContain("look-alike");
    expect(assess("https://аpple.com").domain).toBe("xn--pple-43d.com");
  });

  it("flags bare IP addresses", () => {
    expect(codes("https://192.168.1.10/login")).toContain("ip-address");
    expect(codes("https://[::1]/")).toContain("ip-address");
  });

  it("flags link shorteners", () => {
    expect(codes("https://bit.ly/3abc")).toContain("shortener");
    expect(codes("https://www.tinyurl.com/x")).toContain("shortener");
  });

  it("refuses what is not a URL", () => {
    expect(assess("not a url")).toEqual({ domain: null, openable: false, warnings: [] });
  });

  it("flags a user name dressed up as the destination", () => {
    const result = assess("https://paypal.com@evil.xyz/login");
    expect(result.domain).toBe("evil.xyz");
    expect(result.warnings.map((w) => w.code)).toContain("userinfo");
    expect(result.warnings.find((w) => w.code === "userinfo")?.severity).toBe("danger");
    expect(codes("https://user:pass@example.com/")).toContain("userinfo");
  });

  describe("decoy domains", () => {
    const decoy = "https://paypal.com.secure-login.example.net/";

    it("AC1 warns once, as danger, naming both domains", () => {
      const a = assess(decoy);
      expect(a.warnings.map((w) => w.code)).toEqual(["decoy-domain"]);
      expect(a.warnings[0].severity).toBe("danger");
      expect(a.warnings[0].message).toContain("paypal.com");
      expect(a.warnings[0].message).toContain("example.net");
      expect(a.warnings[0].message).not.toContain("secure-login");
      expect(a.openable).toBe(true);
      for (const g of ["com", "net", "org", "io", "co", "gov", "edu"]) {
        expect(codes(`https://paypal.${g}.secure-login.example.net/`)).toEqual(["decoy-domain"]);
      }
      expect(codes("https://paypal.com.google.com.example.net/")).toEqual(["decoy-domain"]);
    });

    it("AC2 shows the registrable domain", () => {
      expect(assess(decoy).domain).toBe("example.net");
      for (const s of ["co.uk", "com.au", "co.jp", "com.br"]) {
        const a = assess(`https://paypal.com.secure-login.example.${s}/`);
        expect(a.domain).toBe(`example.${s}`);
        expect(a.warnings.map((w) => w.code)).toContain("decoy-domain");
      }
    });

    it("AC3 leaves ordinary hosts alone", () => {
      for (const h of [
        "www.example.com",
        "mail.google.com",
        "a.b.example.co.uk",
        "api.us.example.com",
        "co.example.com",
        "staging.app.example.com",
      ]) {
        expect(assess(`https://${h}/`)).toEqual({ domain: h, openable: true, warnings: [] });
      }
    });
  });
});
