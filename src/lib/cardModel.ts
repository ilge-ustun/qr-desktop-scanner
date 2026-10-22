// What a contact, phone, SMS or geo card shows: its label, its headline, a
// row per other value, and its one Open when it has one. Every value is read
// from the code and is untrusted text: the card shows it as text.

import { LABELS, type Payload } from "./payload";

/** A value read from the code, under the app's name for it. */
type Field = { label: string; value: string };

export type FieldCardModel = {
  /** The kind of code: the app's word, on the label. */
  meta: string;
  /** Read from the code: the name, number or place the card is about. */
  headline: string;
  /** The label of the button that copies the headline ("Copy name"). */
  copyHeadline: string;
  /** One row per other value, each with its own Copy. */
  fields: Field[];
  /** The card's one other action, an Open of a link the app built itself. */
  open: { label: string; url: string } | null;
};

/** The payloads a field card shows. */
export type FieldPayload = Extract<Payload, { kind: "contact" | "phone" | "sms" | "geo" }>;

export function fieldCardModel(payload: FieldPayload): FieldCardModel {
  switch (payload.kind) {
    case "contact": {
      // It calls, sends, opens and adds nothing.
      const { name, phones, emails, organisations, websites } = payload.contact;
      return {
        meta: LABELS.contact,
        headline: name,
        copyHeadline: "Copy name",
        fields: [
          ...phones.map((value) => ({ label: "Phone", value })),
          ...emails.map((value) => ({ label: "Email", value })),
          ...organisations.map((value) => ({ label: "Organisation", value })),
          ...websites.map((value) => ({ label: "Website", value })),
        ],
        open: null,
      };
    }
    case "phone":
      // No Call.
      return { meta: LABELS.phone, headline: payload.number, copyHeadline: "Copy number", fields: [], open: null };
    case "sms": {
      // No Send.
      const { number, message } = payload.sms;
      return {
        meta: LABELS.sms,
        headline: number,
        copyHeadline: "Copy number",
        fields: message ? [{ label: "Message", value: message }] : [],
        open: null,
      };
    }
    case "geo": {
      const { coordinates, place, search, mapsLink } = payload.geo;
      return {
        meta: LABELS.geo,
        headline: place || coordinates,
        copyHeadline: place ? "Copy place" : "Copy coordinates",
        // In the search form (geo:0,0?q=…) 0,0 is no place: the search stands alone.
        fields: place && !search ? [{ label: "Coordinates", value: coordinates }] : [],
        // Only for valid coordinates, with the link the parser built from the two numbers.
        open: mapsLink ? { label: "Open in Maps", url: mapsLink } : null,
      };
    }
  }
}
