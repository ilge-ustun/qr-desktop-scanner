// Wi-Fi codes, and what the card says about the network. Every value is
// untrusted text.

import { afterPrefix, splitUnescaped, unescapeBackslashes } from "./text";

export type WifiNetwork = {
  ssid: string;
  password: string;
  /** As written in the code: WPA, WEP, nopass, SAE, … ("" when absent). */
  security: string;
  hidden: boolean;
};

/**
 * The de-facto Wi-Fi QR format (from ZXing):
 * `WIFI:T:WPA;S:<name>;P:<password>;H:true;;`. Fields come in any order;
 * `\`, `;`, `,`, `:` and `"` inside a value are escaped with a backslash, and
 * some generators wrap a value in double quotes.
 */
export function parseWifi(text: string): WifiNetwork | null {
  const body = afterPrefix(text, "WIFI:");
  return body === null ? null : parseWifiBody(body);
}

/** `parseWifi` for the text after `WIFI:`. A field ends at an unescaped `;`
 * and splits at its first unescaped `:`; the value is unescaped, then
 * unquoted. Two quirks stay as they were: a field with no colon that ends at
 * a `;` is stored as "" (and replaces an earlier value of its key), and the
 * last field, with no `;` after it, is dropped when it has no colon. */
export function parseWifiBody(body: string): WifiNetwork | null {
  const fields = new Map<string, string>();
  const parts = splitUnescaped(body, ";");
  parts.forEach((part, i) => {
    const [rawKey, ...rest] = splitUnescaped(part, ":");
    const key = unescapeBackslashes(rawKey);
    if (!key || (i === parts.length - 1 && !rest.length)) return;
    fields.set(key.toUpperCase(), unquote(unescapeBackslashes(rest.join(":"))));
  });

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

/** The app's word for each security type. The type is looked up upper-cased,
 * and no name on Object.prototype is upper case: "constructor" finds nothing
 * and is shown as written. */
const SECURITY: Record<string, string> = {
  "": "open network",
  NOPASS: "open network",
  WEP: "WEP",
  WPA: "WPA/WPA2",
  WPA2: "WPA2",
  WPA3: "WPA3",
  SAE: "WPA3",
};

/** The Wi-Fi card's label: the kind, the security (an unknown type as
 * written), and "hidden" for a network that does not broadcast its name. */
export function wifiMeta(network: WifiNetwork): string {
  const security = SECURITY[network.security.toUpperCase()] ?? network.security;
  return ["Wi-Fi", security, network.hidden ? "hidden" : ""].filter(Boolean).join(" · ");
}
