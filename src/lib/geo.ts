// Geo codes: `geo:<lat>,<lon>[,<alt>][;<param>…][?<query>]` (RFC 5870), and
// Android's search form `geo:0,0?q=<place>`. Every value is untrusted text.

import { queryParam, splitOnce } from "./query";

export type Geo = {
  /** As written: the text between `geo:` and the first `;` or `?`. */
  coordinates: string;
  /** The percent-decoded `q` parameter, a place or a search ("" when absent). */
  place: string;
  /** Android's search form, `geo:0,0?q=…`: there 0,0 means "no coordinates". */
  search: boolean;
  /** `https://maps.apple.com/?ll=<lat>,<lon>`, built from the two validated
   * numbers alone; null when the coordinates are not valid, or are the
   * search form's `0,0`. */
  mapsLink: string | null;
};

/** An optional `-`, digits, then optionally `.` and digits: no `+`, hex,
 * exponent or empty part. */
const NUMBER = /^-?\d+(\.\d+)?$/;

/** Returns null without coordinate text. */
export function parseGeo(text: string): Geo | null {
  if (!/^geo:/i.test(text)) return null;
  const [path, query] = splitOnce(text.slice("geo:".length), "?");
  const coordinates = path.split(";", 1)[0];
  if (!coordinates.trim()) return null;

  const place = query === null ? null : queryParam(query, "q");
  const search = coordinates === "0,0" && place !== null;
  const position = search ? null : latitudeLongitude(coordinates);
  return {
    coordinates,
    place: place ?? "",
    search,
    mapsLink: position && `https://maps.apple.com/?ll=${position.join(",")}`,
  };
}

/** Latitude in [-90, 90] and longitude in [-180, 180], as written, when the
 * coordinates are those two numbers, optionally followed by an altitude. */
function latitudeLongitude(coordinates: string): [string, string] | null {
  const parts = coordinates.split(",");
  if (parts.length < 2 || parts.length > 3 || !parts.every((part) => NUMBER.test(part))) return null;
  const [latitude, longitude] = parts;
  return Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 ? [latitude, longitude] : null;
}
