// SMS codes: `sms:<number>?body=<message>` (RFC 5724) and ZXing's
// `SMSTO:<number>:<message>`. Every value is untrusted text.

import { queryParam, splitOnce } from "./query";
import { afterPrefix } from "./text";

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
  const sms = afterPrefix(text, "sms:");
  const smsto = sms === null ? afterPrefix(text, "SMSTO:") : null;
  if (sms !== null) {
    const [recipient, query] = splitOnce(sms, "?");
    number = recipient;
    message = query === null ? "" : (queryParam(query, "body") ?? "");
  } else if (smsto !== null) {
    const [recipient, rest] = splitOnce(smsto, ":");
    number = recipient;
    message = rest ?? "";
  } else {
    return null;
  }
  return number.trim() ? { number, message } : null;
}
