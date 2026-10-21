// The `?name=value&…` part of an sms: or geo: code. Values are
// percent-encoded; one that is not valid percent-encoding is kept as written.

/** The first `name=` parameter's value, percent-decoded; null when there is
 * none. `query` is the text after the `?`. Names match in any case. */
export function queryParam(query: string, name: string): string | null {
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq >= 0 && pair.slice(0, eq).toLowerCase() === name) return percentDecoded(pair.slice(eq + 1));
  }
  return null;
}

/** `value` percent-decoded as UTF-8, or exactly as written when it is not
 * valid percent-encoding (`100%`, `%E0%A4%A`). Never throws. */
export function percentDecoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The text before the first `separator`, and the text after it (null when
 * there is no separator). */
export function splitOnce(text: string, separator: string): [string, string | null] {
  const at = text.indexOf(separator);
  return at < 0 ? [text, null] : [text.slice(0, at), text.slice(at + separator.length)];
}
