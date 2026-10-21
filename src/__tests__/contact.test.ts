import { describe, expect, it } from "vitest";

import { parseMecard, parseVCard } from "../lib/contact";

const vcard = (...lines: string[]) => ["BEGIN:VCARD", "VERSION:3.0", ...lines, "END:VCARD"].join("\n");

describe("parseVCard", () => {
  it("unfolds a line broken by LF and a tab, dropping only that one character", () => {
    expect(parseVCard(vcard("FN:Jane\n\t Doe", "EMAIL:jane@exam\n ple.com"))).toMatchObject({
      name: "Jane Doe",
      emails: ["jane@example.com"],
    });
  });

  it("reads property names in any case, with or without a group", () => {
    expect(parseVCard("begin:vcard\nfn:Jane Doe\nTel;type=cell:+31\nITEM2.Email:j@example.com\nend:vcard")).toEqual({
      name: "Jane Doe",
      phones: ["+31"],
      emails: ["j@example.com"],
      organisations: [],
      websites: [],
    });
  });

  it("reads \\N as a line break and keeps other backslashes", () => {
    expect(parseVCard(vcard("FN:Jane", "ORG:Acme\\NLabs", "URL:https://example.com/a\\b"))).toMatchObject({
      organisations: ["Acme\nLabs"],
      websites: ["https://example.com/a\\b"],
    });
  });

  it("splits N on unescaped semicolons only", () => {
    expect(parseVCard(vcard("N:Doe\\;Smith;Jane;;;"))?.name).toBe("Jane Doe;Smith");
    expect(parseVCard(vcard("N:Doe;;;;"))?.name).toBe("Doe");
  });

  it("takes the name from N when FN is empty", () => {
    expect(parseVCard(vcard("FN:  ", "N:Doe;Jane;;;"))?.name).toBe("Jane Doe");
  });

  it("joins an organisation's units and drops the empty ones", () => {
    expect(parseVCard(vcard("FN:Jane", "ORG:Acme;Marketing;"))?.organisations).toEqual(["Acme, Marketing"]);
  });

  it("skips empty values and lists a repeated one once", () => {
    expect(parseVCard(vcard("FN:Jane", "TEL;TYPE=CELL:+31 6", "TEL;TYPE=VOICE:+31 6", "TEL:", "EMAIL:"))).toMatchObject({
      phones: ["+31 6"],
      emails: [],
    });
  });

  it("finds the value after a quoted parameter with a colon in it", () => {
    expect(parseVCard(vcard("FN:Jane", 'TEL;TYPE="a:b":+31'))?.phones).toEqual(["+31"]);
  });

  it("ignores ADR, TITLE, NOTE, BDAY, NICKNAME and what follows END:VCARD", () => {
    const text =
      vcard("FN:Jane", "ADR:;;Main St 1;;;;", "TITLE:Boss", "NOTE:hi", "BDAY:1990-01-01", "NICKNAME:JD") +
      "\nTEL:+31";
    expect(parseVCard(text)).toEqual({ name: "Jane", phones: [], emails: [], organisations: [], websites: [] });
  });

  it("returns null without END:VCARD, without a name, or when it is not a vCard", () => {
    expect(parseVCard("BEGIN:VCARD\nFN:Jane Doe")).toBeNull();
    expect(parseVCard(vcard("N:;;;;", "TEL:+31"))).toBeNull();
    expect(parseVCard("BEGIN:VCARDS\nFN:Jane\nEND:VCARD")).toBeNull();
    expect(parseVCard("FN:Jane")).toBeNull();
  });
});

describe("parseMecard", () => {
  it("splits N on unescaped commas only, and takes a name without one as written", () => {
    expect(parseMecard("MECARD:N:Doe\\, Jr.,Jane;;")?.name).toBe("Jane Doe, Jr.");
    expect(parseMecard("MECARD:N:Jane Doe;;")?.name).toBe("Jane Doe");
  });

  it("reads field names in any case and tolerates a missing final ;;", () => {
    expect(parseMecard("mecard:n:Doe,Jane;tel:+31;email:jane@example.com")).toEqual({
      name: "Jane Doe",
      phones: ["+31"],
      emails: ["jane@example.com"],
      organisations: [],
      websites: [],
    });
  });

  it("keeps every colon after the field name, and ignores other fields", () => {
    expect(parseMecard("MECARD:N:Jane;ADR:Main St;NOTE:a:b;URL:https://example.com:8080/x;;")).toEqual({
      name: "Jane",
      phones: [],
      emails: [],
      organisations: [],
      websites: ["https://example.com:8080/x"],
    });
  });

  it("returns null without a name", () => {
    expect(parseMecard("MECARD:TEL:+31;;")).toBeNull();
    expect(parseMecard("MECARD:N:,;TEL:+31;;")).toBeNull();
    expect(parseMecard("WIFI:S:Home;;")).toBeNull();
  });
});
