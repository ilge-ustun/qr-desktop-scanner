import { describe, expect, it } from "vitest";

import { fieldCardModel } from "../lib/cardModel";
import { classify, type Payload } from "../lib/payload";
import { V1, V1_CONTACT } from "./contactCodes";

type FieldKind = "contact" | "phone" | "sms" | "geo";

/** classify(code), which must be of `kind`. */
function payloadOf<K extends FieldKind>(kind: K, code: string): Extract<Payload, { kind: K }> {
  const payload = classify(code);
  expect(payload.kind, code).toBe(kind);
  return payload as Extract<Payload, { kind: K }>;
}

const MAPS = "https://maps.apple.com/?ll=";

describe("AC1 fieldCardModel: the label, headline, Copy label, rows and Open of a field card", () => {
  it("C1: a contact is its name, then its phones, emails, organisation and website, in that order", () => {
    expect(fieldCardModel(payloadOf("contact", V1))).toEqual({
      meta: "Contact",
      headline: "Jane Doe",
      copyHeadline: "Copy name",
      fields: [
        ...V1_CONTACT.phones.map((value) => ({ label: "Phone", value })),
        ...V1_CONTACT.emails.map((value) => ({ label: "Email", value })),
        { label: "Organisation", value: V1_CONTACT.organisations[0] },
        { label: "Website", value: V1_CONTACT.websites[0] },
      ],
      open: null,
    });
  });

  it("P1: a phone is its number alone, with Copy number", () => {
    expect(fieldCardModel(payloadOf("phone", "tel:+31201234567"))).toEqual({
      meta: "Phone",
      headline: "+31201234567",
      copyHeadline: "Copy number",
      fields: [],
      open: null,
    });
  });

  it.each([
    ["S1", "sms:+31201234567?body=Running%20late%3A%2010%20min", [{ label: "Message", value: "Running late: 10 min" }]],
    ["S3", "sms:+31201234567", []],
  ])("%s: an SMS is its number, and a Message row only when there is a message", (_, code, fields) => {
    expect(fieldCardModel(payloadOf("sms", code))).toEqual({
      meta: "SMS",
      headline: "+31201234567",
      copyHeadline: "Copy number",
      fields,
      open: null,
    });
  });

  it.each([
    [
      "G3",
      "geo:-33.8568,151.2153?q=Opera%20House",
      "Opera House",
      "Copy place",
      [{ label: "Coordinates", value: "-33.8568,151.2153" }],
      { label: "Open in Maps", url: `${MAPS}-33.8568,151.2153` },
    ],
    [
      "G1",
      "geo:52.3731,4.8922",
      "52.3731,4.8922",
      "Copy coordinates",
      [],
      { label: "Open in Maps", url: `${MAPS}52.3731,4.8922` },
    ],
    ["X1", "geo:90.0001,0", "90.0001,0", "Copy coordinates", [], null],
    ["X8", "geo:90.0001,0?q=Somewhere", "Somewhere", "Copy place", [{ label: "Coordinates", value: "90.0001,0" }], null],
    ["A1", "geo:0,0?q=Rijksmuseum%20Amsterdam", "Rijksmuseum Amsterdam", "Copy place", [], null],
  ])(
    "%s: a location is its place, else its coordinates; Open in Maps only for valid coordinates",
    (_, code, headline, copyHeadline, fields, open) => {
      expect(fieldCardModel(payloadOf("geo", code))).toEqual({ meta: "Location", headline, copyHeadline, fields, open });
    },
  );
});
