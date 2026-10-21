// What kind of thing a decoded QR code holds. The text is untrusted: it is
// whatever someone printed or put on a screen.

export type Payload =
  | { kind: "url"; text: string }
  | { kind: "email"; text: string; address: string }
  | { kind: "phone"; text: string; number: string }
  | { kind: "wifi"; text: string }
  | { kind: "text"; text: string };

export const LABELS: Record<Payload["kind"], string> = {
  url: "Link",
  email: "Email",
  phone: "Phone",
  wifi: "Wi-Fi",
  text: "Text",
};

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function classify(raw: string): Payload {
  const text = raw.trim();
  if (/^mailto:/i.test(text)) {
    return { kind: "email", text, address: text.slice("mailto:".length).split("?")[0] };
  }
  if (/^tel:/i.test(text)) {
    return { kind: "phone", text, number: text.slice("tel:".length) };
  }
  if (/^WIFI:/i.test(text)) {
    return { kind: "wifi", text };
  }
  // Anything with a scheme and no spaces is a link, whatever the scheme: a
  // `javascript:` or app link must still be shown as one, with its warning.
  if (SCHEME.test(text) && !/\s/.test(text) && URL.canParse(text)) {
    return { kind: "url", text };
  }
  return { kind: "text", text };
}
