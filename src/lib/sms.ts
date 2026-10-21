// SMS codes: `sms:<number>?body=<message>` (RFC 5724) and ZXing's
// `SMSTO:<number>:<message>`. Every value is untrusted text.

import { queryParam, splitOnce } from "./query";

export type Sms = {
  number: string;
  /** "" when the code has none. */
  message: string;
};

/**
 * `sms:`: the number is the text up to `?`, the message the percent-decoded
 * `body` parameter. `SMSTO:`: the number is the text up to the first `:`, the
 * message everything after it, colons included. Returns null without a
 * number.
 */
export function parseSms(text: string): Sms | null {
  let number: string;
  let message: string;
  if (/^sms:/i.test(text)) {
    const [recipient, query] = splitOnce(text.slice("sms:".length), "?");
    number = recipient;
    message = query === null ? "" : (queryParam(query, "body") ?? "");
  } else if (/^SMSTO:/i.test(text)) {
    const [recipient, rest] = splitOnce(text.slice("SMSTO:".length), ":");
    number = recipient;
    message = rest ?? "";
  } else {
    return null;
  }
  return number.trim() ? { number, message } : null;
}
