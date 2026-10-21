// What kind of thing a decoded QR code holds. The text is untrusted: it is
// whatever someone printed or put on a screen.

export type Payload =
  | { kind: "url"; text: string }
  | { kind: "email"; text: string; address: string }
  | { kind: "phone"; text: string; number: string }
  | { kind: "wifi"; text: string; network: WifiNetwork | null }
  | { kind: "text"; text: string };

export type WifiNetwork = {
  ssid: string;
  password: string;
  /** As written in the code: WPA, WEP, nopass, SAE, … ("" when absent). */
  security: string;
  hidden: boolean;
};

export const LABELS: Record<Payload["kind"], string> = {
  url: "Link",
  email: "Email",
  phone: "Phone",
  wifi: "Wi-Fi",
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
  if (/^WIFI:/i.test(text)) {
    return { kind: "wifi", text, network: parseWifi(text) };
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

/**
 * The de-facto Wi-Fi QR format (from ZXing):
 * `WIFI:T:WPA;S:<name>;P:<password>;H:true;;`. Fields come in any order;
 * `\`, `;`, `,`, `:` and `"` inside a value are escaped with a backslash, and
 * some generators wrap a value in double quotes.
 */
export function parseWifi(text: string): WifiNetwork | null {
  if (!/^WIFI:/i.test(text)) return null;
  const fields = new Map<string, string>();
  let key = "";
  let value = "";
  let inValue = false;
  const body = text.slice("WIFI:".length);
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\" && i + 1 < body.length) {
      if (inValue) value += body[++i];
      else key += body[++i];
    } else if (c === ":" && !inValue) {
      inValue = true;
    } else if (c === ";") {
      if (key) fields.set(key.toUpperCase(), unquote(value));
      key = "";
      value = "";
      inValue = false;
    } else if (inValue) {
      value += c;
    } else {
      key += c;
    }
  }
  if (key && inValue) fields.set(key.toUpperCase(), unquote(value));

  const ssid = fields.get("S");
  if (!ssid) return null;
  return {
    ssid,
    password: fields.get("P") ?? "",
    security: fields.get("T") ?? "",
    hidden: (fields.get("H") ?? "").toLowerCase() === "true",
  };
}

function unquote(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}
