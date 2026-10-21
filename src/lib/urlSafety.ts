// How much to trust a decoded link before opening it. Rust re-checks the
// scheme in open_link (qr-core url_guard); this decides what the card shows.

export type Severity = "danger" | "caution";

export type Warning = { code: string; severity: Severity; message: string };

export type Assessment = {
  /** Shown big on the card: the part that says where the link really goes. */
  domain: string | null;
  /** Whether the card offers Open. Matches the schemes url_guard allows. */
  openable: boolean;
  warnings: Warning[];
};

const DANGEROUS_SCHEMES = new Set(["javascript", "data", "file", "vbscript", "blob"]);

const SHORTENERS = new Set([
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "qrco.de",
  "rebrand.ly",
  "s.id",
  "shorturl.at",
  "t.co",
  "t.ly",
  "tinyurl.com",
]);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function assess(text: string): Assessment {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return { domain: null, openable: false, warnings: [] };
  }
  const scheme = url.protocol.replace(/:$/, "").toLowerCase();
  const warnings: Warning[] = [];

  if (scheme === "mailto") {
    return { domain: null, openable: true, warnings };
  }
  if (DANGEROUS_SCHEMES.has(scheme)) {
    warnings.push({
      code: "dangerous-scheme",
      severity: "danger",
      message: `This is a ${scheme}: link, which can run code or read local files. Don't open it.`,
    });
    return { domain: null, openable: false, warnings };
  }
  if (scheme !== "http" && scheme !== "https") {
    warnings.push({
      code: "app-scheme",
      severity: "caution",
      message: `This ${scheme}: link opens another app, not a web page. Copy it only if you trust where it came from.`,
    });
    return { domain: url.hostname || null, openable: false, warnings };
  }

  // The URL parser turns Unicode hostnames into punycode, so look-alike
  // characters always show up as an xn-- label here.
  const host = url.hostname.toLowerCase();
  // https://paypal.com@evil.xyz goes to evil.xyz: everything before the @ is
  // a user name, there only to look like the destination.
  if (url.username || url.password) {
    warnings.push({
      code: "userinfo",
      severity: "danger",
      message: `The part before "@" is decoration: this link really goes to ${host}.`,
    });
  }
  if (scheme === "http") {
    warnings.push({
      code: "not-encrypted",
      severity: "caution",
      message: "Not encrypted (http). Don't enter passwords or payment details there.",
    });
  }
  if (host.split(".").some((label) => label.startsWith("xn--"))) {
    warnings.push({
      code: "look-alike",
      severity: "danger",
      message: "The address uses non-Latin or look-alike characters. Check the domain letter by letter.",
    });
  }
  if (IPV4.test(host) || host.startsWith("[")) {
    warnings.push({
      code: "ip-address",
      severity: "caution",
      message: "The link goes to a bare IP address, not a named website.",
    });
  }
  if (SHORTENERS.has(host.replace(/^www\./, ""))) {
    warnings.push({
      code: "shortener",
      severity: "caution",
      message: "A link shortener hides the real destination until you open it.",
    });
  }
  return { domain: host || null, openable: host !== "", warnings };
}
