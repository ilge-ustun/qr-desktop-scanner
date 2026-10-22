// What kind of thing a decoded QR code holds. The text is untrusted: it is
// whatever someone printed or put on a screen.

import { parseMecard, parseVCard, type Contact } from "./contact";
import { parseGeo, type Geo } from "./geo";
import { parseSms, type Sms } from "./sms";
import { parseWifi, type WifiNetwork } from "./wifi";

// Its home was here, and a test still reads it from here.
export type { WifiNetwork };

export type Payload =
  | { kind: "url"; text: string }
  | { kind: "email"; text: string; address: string }
  | { kind: "phone"; text: string; number: string }
  | { kind: "wifi"; text: string; network: WifiNetwork | null }
  | { kind: "contact"; text: string; contact: Contact }
  | { kind: "sms"; text: string; sms: Sms }
  | { kind: "geo"; text: string; geo: Geo }
  | { kind: "text"; text: string };

export const LABELS: Record<Payload["kind"], string> = {
  url: "Link",
  email: "Email",
  phone: "Phone",
  wifi: "Wi-Fi",
  contact: "Contact",
  sms: "SMS",
  geo: "Location",
  text: "Text",
};

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Schemes that run code or read local content: always a link, so the card
 * shows its warning, whatever else the text contains. */
const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file):/i;

export function classify(raw: string): Payload {
  const text = raw.trim();
  if (/^mailto:/i.test(text)) {
    return { kind: "email", text, address: text.slice("mailto:".length).split("?")[0] };
  }
  if (/^tel:/i.test(text)) {
    return { kind: "phone", text, number: text.slice("tel:".length) };
  }
  // Before the link test below: these may hold spaces. One without a number
  // or without coordinates reads on, and gets the card it got before.
  const sms = parseSms(text);
  if (sms) return { kind: "sms", text, sms };
  const geo = parseGeo(text);
  if (geo) return { kind: "geo", text, geo };
  if (/^WIFI:/i.test(text)) {
    return { kind: "wifi", text, network: parseWifi(text) };
  }
  // A contact code that does not parse is text: "MECARD:…" without a space
  // would otherwise pass for a link below.
  if (/^BEGIN:VCARD/i.test(text)) {
    const contact = parseVCard(text);
    return contact ? { kind: "contact", text, contact } : { kind: "text", text };
  }
  if (/^MECARD:/i.test(text)) {
    const contact = parseMecard(text);
    return contact ? { kind: "contact", text, contact } : { kind: "text", text };
  }
  if (DANGEROUS_SCHEME.test(text)) {
    return { kind: "url", text };
  }
  // Anything else with a scheme and no spaces is a link, whatever the scheme:
  // an app link must still be shown as one, with its warning. ("Note: call
  // me" has a scheme-like start and spaces, and stays text.)
  if (SCHEME.test(text) && !/\s/.test(text) && URL.canParse(text)) {
    return { kind: "url", text };
  }
  return { kind: "text", text };
}
