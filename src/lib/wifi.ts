// Wi-Fi codes, and what the card says about the network. Every value is
// untrusted text.

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
