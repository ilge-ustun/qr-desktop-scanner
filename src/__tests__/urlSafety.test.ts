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

// Story 010. G and C as the story names them.
const G = ["co", "com", "net", "org", "ac", "gov", "edu", "or", "ne", "go"];
const C = ["kr", "ar", "pl", "at", "th"];
const DECOY = (o: string) => `This address starts with "paypal.com" but belongs to ${o}.`;
const decoyResult = (o: string) => ({
  domain: o,
  openable: true,
  warnings: [{ code: "decoy-domain", severity: "danger", message: DECOY(o) }],
});

it("010 AC1: a two-letter country code after one of the ten labels joins the suffix", () => {
  for (const g of G) {
    for (const c of C) {
      const url = `https://paypal.com.evil.${g}.${c}/`;
      expect(assess(url), url).toEqual(decoyResult(`evil.${g}.${c}`));
    }
  }
});

it("010 AC1: one trailing dot is dropped from the owner, the message and the shown domain", () => {
  expect(new URL("https://paypal.com.evil.com./").hostname).toBe("paypal.com.evil.com.");
  expect(assess("https://paypal.com.evil.com./")).toEqual(decoyResult("evil.com"));
  expect(assess("https://paypal.com.evil.co.kr./")).toEqual(decoyResult("evil.co.kr"));
  expect(assess("https://www.example.com./")).toEqual({
    domain: "www.example.com",
    openable: true,
    warnings: [],
  });
});

it.each([
  ["https://paypal.com.evil.de/", "evil.de"],
  ["https://paypal.com.evil.io/", "evil.io"],
  ["https://paypal.com.evil.co/", "evil.co"],
  ["https://paypal.com.evil.co.xyz/", "co.xyz"],
])("010 AC2: %s belongs to %s, the last two labels", (url, owner) => {
  expect(assess(url)).toEqual(decoyResult(owner));
});

const extraRecipients = (text: string) => {
  const a = assess(text);
  expect(a.domain, text).toBeNull();
  expect(a.openable, text).toBe(true);
  expect(a.warnings, text).toHaveLength(1);
  expect(a.warnings[0].code, text).toBe("extra-recipients");
  expect(a.warnings[0].severity, text).toBe("caution");
  return a.warnings[0].message;
};

it("010 AC3: a bcc names the address it adds, in the full message", () => {
  expect(extraRecipients("mailto:boss@corp.com?bcc=x@evil.com&body=Quarterly%20figures")).toBe(
    "The link adds x@evil.com to the recipients. Check every address before you send it.",
  );
});

it.each([
  ["mailto:boss@corp.com?to=a@evil.com", ["a@evil.com"]],
  ["mailto:boss@corp.com?cc=b@evil.com", ["b@evil.com"]],
  ["mailto:boss@corp.com?subject=Hi&CC=c@evil.com", ["c@evil.com"]],
  ["mailto:boss@corp.com?Bcc=d@evil.com", ["d@evil.com"]],
  ["mailto:boss@corp.com?TO=e@evil.com", ["e@evil.com"]],
  [
    "mailto:boss@corp.com?cc=f@evil.com,g@evil.com&cc=h@evil.com&bcc=i@evil.com",
    ["f@evil.com", "g@evil.com", "h@evil.com", "i@evil.com"],
  ],
  ["mailto:boss@corp.com?bcc=j%40evil.com", ["j@evil.com"]],
  ["mailto:boss@corp.com?bcc=k%40evil.com%ZZ", ["evil.com"]],
])("010 AC3: %s gets one caution naming %j", (text, named) => {
  const message = extraRecipients(text);
  for (const n of named) expect(message).toContain(n);
});

it.each([
  "mailto:boss@corp.com",
  "mailto:boss@corp.com?subject=Lunch&body=See%20you%20at%201",
  "mailto:boss@corp.com?in-reply-to=%3C42%40corp.com%3E",
  "mailto:boss@corp.com?body=Hi%26cc%3Dx%40evil.com",
  "mailto:boss@corp.com?subject=bcc&body=cc%20to",
])("010 AC4: %s gets no warning", (text) => {
  expect(assess(text)).toEqual({ domain: null, openable: true, warnings: [] });
});

it("010: a mailto with nothing before the ? still names who its to adds", () => {
  expect(extraRecipients("mailto:?to=a@evil.com")).toBe(
    "The link adds a@evil.com to the recipients. Check every address before you send it.",
  );
});

it("010: an empty to, cc or bcc adds no one and gets no warning", () => {
  expect(assess("mailto:boss@corp.com?to=&cc=%20&bcc=,")).toEqual({ domain: null, openable: true, warnings: [] });
});

it("010: an address keeps its + and a field name may be percent-encoded", () => {
  expect(extraRecipients("mailto:boss@corp.com?bcc=x+tag@evil.com")).toContain("x+tag@evil.com");
  expect(extraRecipients("mailto:boss@corp.com?%62cc=y@evil.com")).toContain("y@evil.com");
});
