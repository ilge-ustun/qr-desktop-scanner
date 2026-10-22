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

// Two-part public suffixes, so example.co.uk counts as one name, not "co.uk".
const TWO_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.br",
  "net.br",
  "org.br",
  "co.nz",
  "co.in",
  "co.za",
  "com.mx",
  "com.cn",
  "com.tr",
]);

// Second labels that make a two-letter country code a two-part suffix too,
// so example.co.kr counts as one name even where co.kr is not listed above.
const COUNTRY_SECOND_LABELS = new Set(["co", "com", "net", "org", "ac", "gov", "edu", "or", "ne", "go"]);

const COUNTRY_CODE = /^[a-z]{2}$/;

// Labels that make a name look like it ends there: paypal.com.example.net.
const DECOY_LABELS = new Set(["com", "net", "org", "io", "co", "gov", "edu"]);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// This Mac or the local network: localhost and .local names, loopback,
// private and link-local addresses. The URL parser has already written an IP
// in its canonical form (2130706433 is 127.0.0.1, [0:0:0:0:0:0:0:1] is [::1]).
function isLocal(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (IPV4.test(host)) {
    const [a, b] = host.split(".").map(Number);
    return (
      a === 127 || // 127/8 loopback
      a === 10 || // 10/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16/12
      (a === 192 && b === 168) || // 192.168/16
      (a === 169 && b === 254) // 169.254/16 link-local
    );
  }
  if (host.startsWith("[")) {
    if (host === "[::1]") return true;
    // The first 16 bits; "[::…" means they are zero.
    const first = Number.parseInt(host.slice(1).split(":")[0] || "0", 16);
    return (
      (first & 0xfe00) === 0xfc00 || // fc00::/7 unique local
      (first & 0xffc0) === 0xfe80 // fe80::/10 link-local
    );
  }
  return false;
}

// mailto:boss@corp.com?bcc=x@evil.com also writes to x@evil.com, which the
// card's headline (everything before the "?") does not show.
const RECIPIENT_FIELDS = new Set(["to", "cc", "bcc"]);

// Decodes each run of %XX escapes on its own, so a malformed escape stays as
// typed instead of throwing, and an encoded address cannot hide.
function percentDecode(text: string): string {
  return text.replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

/** The addresses a mailto query's to, cc and bcc fields add, in order. */
function extraRecipients(query: string): string[] {
  return query
    .replace(/^\?/, "")
    .split("&")
    .flatMap((field) => {
      const eq = field.indexOf("=");
      if (eq < 0 || !RECIPIENT_FIELDS.has(percentDecode(field.slice(0, eq)).toLowerCase())) return [];
      return percentDecode(field.slice(eq + 1))
        .split(",")
        .map((address) => address.trim())
        .filter((address) => address !== "");
    });
}

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
    const recipients = extraRecipients(url.search);
    if (recipients.length > 0) {
      warnings.push({
        code: "extra-recipients",
        severity: "caution",
        message: `The link adds ${recipients.join(", ")} to the recipients. Check every address before you send it.`,
      });
    }
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
  // characters always show up as an xn-- label here. It keeps a trailing dot
  // (evil.com. is evil.com), which would otherwise leave an empty last label.
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
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
  if (isLocal(host)) {
    warnings.push({
      code: "local-address",
      severity: "caution",
      message: "The link goes to this Mac or a device on your local network, not a public website.",
    });
  }
  if (SHORTENERS.has(host.replace(/^www\./, ""))) {
    warnings.push({
      code: "shortener",
      severity: "caution",
      message: "A link shortener hides the real destination until you open it.",
    });
  }
  const labels = host.split(".");
  const [second = "", last = ""] = labels.slice(-2);
  const twoPartSuffix =
    TWO_PART_SUFFIXES.has(labels.slice(-2).join(".")) ||
    (COUNTRY_CODE.test(last) && COUNTRY_SECOND_LABELS.has(second));
  const suffixLength = twoPartSuffix ? 3 : 2;
  const registrable = labels.slice(-suffixLength).join(".");
  const front = labels.slice(0, -suffixLength);
  const decoyAt = front.findIndex((label, i) => i > 0 && DECOY_LABELS.has(label));
  if (decoyAt >= 0) {
    warnings.push({
      code: "decoy-domain",
      severity: "danger",
      message: `This address starts with "${front.slice(0, decoyAt + 1).join(".")}" but belongs to ${registrable}.`,
    });
    return { domain: registrable, openable: true, warnings };
  }
  return { domain: host || null, openable: url.hostname !== "", warnings };
}
