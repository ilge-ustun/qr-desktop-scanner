// Small helpers for the parsers: the prefix of a code, and backslash escapes.

/** The text with `A`–`Z` lower-cased and nothing else: unlike `toLowerCase`,
 * it leaves `ı` and `ſ` as they are. */
function foldAscii(text: string): string {
  return text.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** The text after `prefix` when `text` starts with it, `A`–`Z` in either case;
 * null when it does not. The prefix is text, not a pattern. */
export function afterPrefix(text: string, prefix: string): string | null {
  return foldAscii(text.slice(0, prefix.length)) === foldAscii(prefix) ? text.slice(prefix.length) : null;
}

/** Splits on each `separator` that has no backslash before it, keeping the
 * escapes in the parts. */
export function splitUnescaped(text: string, separator: string): string[] {
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

/** MECARD and Wi-Fi escapes: a backslash before any character gives that
 * character. A lone backslash at the end stays. */
export function unescapeBackslashes(text: string): string {
  return text.replace(/\\(.)/gs, "$1");
}
