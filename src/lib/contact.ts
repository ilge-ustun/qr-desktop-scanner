// Contact codes: vCard (RFC 6350) and DoCoMo's MECARD. Only what the card
// shows is read: the name, phones, emails, organisation and website. Every
// value is untrusted text.

export type Contact = {
  name: string;
  phones: string[];
  emails: string[];
  organisations: string[];
  websites: string[];
};

/**
 * `BEGIN:VCARD` … `END:VCARD`, one property per line:
 * `[group.]NAME[;PARAM=…]:value`. A line break followed by one space or tab
 * continues the previous line. Returns null unless the card is closed and has
 * a name (FN, or N when there is no FN).
 */
export function parseVCard(text: string): Contact | null {
  const lines = text.replace(/(?:\r\n|\r|\n)[ \t]/g, "").split(/\r\n|\r|\n/);
  if (!/^BEGIN:VCARD$/i.test(lines[0].trim())) return null;
  const end = lines.findIndex((line) => /^END:VCARD$/i.test(line.trim()));
  if (end < 0) return null;

  const contact = empty();
  let fullName = "";
  let structuredName = "";
  for (const line of lines.slice(1, end)) {
    const property = splitProperty(line);
    if (!property) continue;
    const { name, value } = property;
    if (name === "FN") {
      fullName ||= unescapeVCard(value).trim();
    } else if (name === "N") {
      // Family;Given;Additional;Prefix;Suffix
      const [family = "", given = ""] = splitUnescaped(value, ";").map((part) => unescapeVCard(part).trim());
      structuredName ||= [given, family].filter(Boolean).join(" ");
    } else if (name === "ORG") {
      // Organisation;Unit;… : the empty units Apple leaves are dropped.
      const units = splitUnescaped(value, ";").map((part) => unescapeVCard(part).trim());
      add(contact.organisations, units.filter(Boolean).join(", "));
    } else {
      add(listFor(contact, name), unescapeVCard(value).trim());
    }
  }
  contact.name = fullName || structuredName;
  return contact.name ? contact : null;
}

/**
 * `MECARD:N:Last,First;TEL:…;EMAIL:…;;`. A field ends at an unescaped `;`, a
 * backslash before any character gives that character, and only the first
 * `:` ends the field name. Returns null without a name (N).
 */
export function parseMecard(text: string): Contact | null {
  if (!/^MECARD:/i.test(text)) return null;
  const contact = empty();
  for (const field of splitUnescaped(text.slice("MECARD:".length), ";")) {
    const [key, ...rest] = splitUnescaped(field, ":");
    if (!rest.length) continue;
    const name = key.trim().toUpperCase();
    const value = rest.join(":");
    if (name === "N") {
      const [last = "", first = ""] = splitUnescaped(value, ",").map((part) => unescapeMecard(part).trim());
      contact.name ||= [first, last].filter(Boolean).join(" ");
    } else {
      add(listFor(contact, name), unescapeMecard(value).trim());
    }
  }
  return contact.name ? contact : null;
}

function empty(): Contact {
  return { name: "", phones: [], emails: [], organisations: [], websites: [] };
}

/** The list a TEL, EMAIL, ORG or URL value goes in; null for anything else. */
function listFor(contact: Contact, name: string): string[] | null {
  switch (name) {
    case "TEL":
      return contact.phones;
    case "EMAIL":
      return contact.emails;
    case "ORG":
      return contact.organisations;
    case "URL":
      return contact.websites;
    default:
      return null;
  }
}

function add(list: string[] | null, value: string) {
  if (list && value && !list.includes(value)) list.push(value);
}

/** A vCard line's property name, without its group and parameters, and its
 * value. The value starts after the first colon outside a quoted parameter. */
function splitProperty(line: string): { name: string; value: string } | null {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) {
      const name = line.slice(0, i).split(";")[0];
      return { name: name.slice(name.lastIndexOf(".") + 1).trim().toUpperCase(), value: line.slice(i + 1) };
    }
  }
  return null;
}

/** Splits on each `separator` that has no backslash before it, keeping the
 * escapes in the parts. */
function splitUnescaped(text: string, separator: string): string[] {
  const parts: string[] = [];
  let part = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      part += text[i] + text[++i];
    } else if (text[i] === separator) {
      parts.push(part);
      part = "";
    } else {
      part += text[i];
    }
  }
  parts.push(part);
  return parts;
}

/** vCard text escapes: `\\`, `\,`, `\;`, and `\n` or `\N` for a line break. */
function unescapeVCard(text: string): string {
  return text.replace(/\\([\\,;nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

/** MECARD escapes, as in a Wi-Fi code: a backslash before any character. */
function unescapeMecard(text: string): string {
  return text.replace(/\\(.)/gs, "$1");
}
