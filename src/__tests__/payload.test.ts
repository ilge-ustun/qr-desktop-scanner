import { describe, expect, it } from "vitest";

import { classify, parseWifi } from "../lib/payload";

describe("classify", () => {
  it("treats web links as links", () => {
    expect(classify("https://example.com/menu?t=4")).toEqual({ kind: "url", text: "https://example.com/menu?t=4" });
  });

  it("keeps dangerous and app schemes as links so their warning is shown", () => {
    expect(classify("javascript:alert(1)").kind).toBe("url");
    // A space must not let a script link pass as plain text (found on the Mac).
    expect(classify("javascript:alert('QR test')").kind).toBe("url");
    expect(classify("JavaScript: alert(document.cookie)").kind).toBe("url");
    expect(classify("data:text/html,<b>hi there</b>").kind).toBe("url");
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

describe("parseWifi", () => {
  it("reads name, password and security in any order", () => {
    expect(parseWifi("WIFI:T:WPA;S:Localhost;P:pass word;;")).toEqual({
      ssid: "Localhost",
      password: "pass word",
      security: "WPA",
      hidden: false,
    });
    expect(parseWifi("WIFI:S:Home;P:pw;T:WEP;H:true;;")).toMatchObject({ security: "WEP", hidden: true });
  });

  it("unescapes backslash-escaped characters in values", () => {
    expect(parseWifi(String.raw`WIFI:S:My\;Net\:1;P:a\,b\\c\"d;T:WPA;;`)).toMatchObject({
      ssid: "My;Net:1",
      password: 'a,b\\c"d',
    });
  });

  it("keeps a colon in a value", () => {
    expect(parseWifi("WIFI:S:Lab;P:a:b:c;;")?.password).toBe("a:b:c");
  });

  it("strips the quotes some generators put around values", () => {
    expect(parseWifi('WIFI:S:"12345678";P:"pw";;')).toMatchObject({ ssid: "12345678", password: "pw" });
  });

  it("treats a missing password and type as an open network", () => {
    expect(parseWifi("WIFI:S:Guest;;")).toEqual({ ssid: "Guest", password: "", security: "", hidden: false });
  });

  it("tolerates a missing final ;;", () => {
    expect(parseWifi("WIFI:S:Home;P:pw")).toMatchObject({ ssid: "Home", password: "pw" });
  });

  it("returns null without a network name", () => {
    expect(parseWifi("WIFI:T:WPA;P:pw;;")).toBeNull();
    expect(parseWifi("https://example.com")).toBeNull();
  });

  it("is what classify attaches to a Wi-Fi code", () => {
    expect(classify("WIFI:S:Home;;")).toMatchObject({ kind: "wifi", network: { ssid: "Home" } });
  });
});
