import { describe, expect, it } from "vitest";

import { classify, parseWifi } from "../lib/payload";
import { F1, F2, F3, M1, M1_CONTACT, V1, V1_CONTACT, V2, V2_CONTACT } from "./contactCodes";

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

describe("classify, contacts", () => {
  it("AC1: reads the vCard V1: FN, phones, emails, unescaped ORG, unfolded URL without group or type", () => {
    expect(classify(V1)).toEqual({ kind: "contact", text: V1, contact: V1_CONTACT });
  });

  it("AC1: reads the vCard V2: the name from N when there is no FN, \\n in ORG as a newline", () => {
    expect(classify(V2)).toEqual({ kind: "contact", text: V2, contact: V2_CONTACT });
  });

  it("AC1: reads the MECARD M1: N as First Last, a backslash before any character, colons in a value", () => {
    expect(classify(M1)).toEqual({ kind: "contact", text: M1, contact: M1_CONTACT });
  });

  it("AC2: a contact code that does not parse is text, never a link", () => {
    expect(classify(F1).kind, "F1: no END:VCARD").toBe("text");
    expect(classify(F2).kind, "F2: no FN, no N").toBe("text");
    expect(classify(F3).kind, "F3: no N").toBe("text");
  });
});

describe("classify, SMS and geo", () => {
  it("reads sms: and SMSTO: codes as SMS, with or without spaces", () => {
    expect(classify("sms:+31201234567?body=Running%20late%3A%2010%20min")).toEqual({
      kind: "sms",
      text: "sms:+31201234567?body=Running%20late%3A%2010%20min",
      sms: { number: "+31201234567", message: "Running late: 10 min" },
    });
    expect(classify("SMSTO:+31201234567:Running late: 10 min")).toMatchObject({
      kind: "sms",
      sms: { number: "+31201234567", message: "Running late: 10 min" },
    });
    expect(classify("SMSTO:+31201234567:<img src=x onerror=alert(1)>").kind).toBe("sms");
  });

  it("reads geo: codes as geo, valid or not, with or without spaces", () => {
    expect(classify("geo:52.3731,4.8922;u=35")).toEqual({
      kind: "geo",
      text: "geo:52.3731,4.8922;u=35",
      geo: {
        coordinates: "52.3731,4.8922",
        place: "",
        search: false,
        mapsLink: "https://maps.apple.com/?ll=52.3731,4.8922",
      },
    });
    expect(classify("geo:90.0001,0")).toMatchObject({ kind: "geo", geo: { mapsLink: null } });
    expect(classify("geo:<img src=x onerror=alert(1)>")).toMatchObject({
      kind: "geo",
      geo: { coordinates: "<img src=x onerror=alert(1)>" },
    });
  });

  it("002 AC4: a code with no number or no coordinates (E1, E2, E3) stays a link, as before", () => {
    for (const code of ["sms:?body=Hi", "SMSTO::Hi", "geo:"]) {
      expect(classify(code), code).toEqual({ kind: "url", text: code });
    }
  });

  it("falls back to text for a code with spaces and no number or no coordinates", () => {
    expect(classify("SMSTO::Running late").kind).toBe("text");
    expect(classify("geo:?q=Dam Square").kind).toBe("text");
  });
});
