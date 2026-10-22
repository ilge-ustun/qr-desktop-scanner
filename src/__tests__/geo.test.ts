import { describe, expect, it } from "vitest";

import { parseGeo } from "../lib/geo";

const maps = (ll: string) => `https://maps.apple.com/?ll=${ll}`;

describe("parseGeo (RFC 5870)", () => {
  it("reads the coordinates as written and builds the Maps link from latitude and longitude", () => {
    expect(parseGeo("geo:52.3731,4.8922")).toEqual({
      coordinates: "52.3731,4.8922",
      place: "",
      search: false,
      mapsLink: maps("52.3731,4.8922"),
    });
  });

  it("ends the coordinates at the first ; or ?, and drops the parameters from the link", () => {
    expect(parseGeo("geo:52.3731,4.8922;u=35")).toEqual({
      coordinates: "52.3731,4.8922",
      place: "",
      search: false,
      mapsLink: maps("52.3731,4.8922"),
    });
    expect(parseGeo("geo:52.3731,4.8922;crs=wgs84;u=35?q=x")?.coordinates).toBe("52.3731,4.8922");
    expect(parseGeo("geo:52.3731,4.8922?q=x;u=35")?.coordinates).toBe("52.3731,4.8922");
  });

  it("reads the percent-decoded q as the place, and keeps it out of the link", () => {
    expect(parseGeo("geo:-33.8568,151.2153?q=Opera%20House")).toEqual({
      coordinates: "-33.8568,151.2153",
      place: "Opera House",
      search: false,
      mapsLink: maps("-33.8568,151.2153"),
    });
    expect(parseGeo("geo:1,2?z=3&q=A%26B")?.place).toBe("A&B");
  });

  it("keeps a q that is not valid percent-encoding exactly as written", () => {
    expect(parseGeo("geo:1,2?q=100%")?.place).toBe("100%");
    expect(parseGeo("geo:1,2?q=%E0%A4%A")?.place).toBe("%E0%A4%A");
  });

  it("accepts the bounds, inclusive", () => {
    expect(parseGeo("geo:90,-180")?.mapsLink).toBe(maps("90,-180"));
    expect(parseGeo("geo:-90,180")?.mapsLink).toBe(maps("-90,180"));
    expect(parseGeo("geo:90.0,180.000")?.mapsLink).toBe(maps("90.0,180.000"));
  });

  it("accepts an altitude, and keeps it out of the link", () => {
    expect(parseGeo("geo:52.3731,4.8922,10")).toEqual({
      coordinates: "52.3731,4.8922,10",
      place: "",
      search: false,
      mapsLink: maps("52.3731,4.8922"),
    });
    expect(parseGeo("geo:52.3731,4.8922,-12.5")?.mapsLink).toBe(maps("52.3731,4.8922"));
  });

  it("offers no link outside the range", () => {
    expect(parseGeo("geo:90.0001,0")).toEqual({ coordinates: "90.0001,0", place: "", search: false, mapsLink: null });
    expect(parseGeo("geo:-90.0001,0")?.mapsLink).toBeNull();
    expect(parseGeo("geo:0,180.5")).toEqual({ coordinates: "0,180.5", place: "", search: false, mapsLink: null });
    expect(parseGeo("geo:0,-180.5")?.mapsLink).toBeNull();
  });

  it("offers no link unless each part is an optional -, digits, then optionally . and digits", () => {
    for (const code of [
      "geo:,4.8922",
      "geo:52.3731,",
      "geo:0x10,5",
      "geo:1e1,5",
      "geo:+1,5",
      "geo:1.,5",
      "geo:.5,5",
      "geo:1,5,",
      "geo:1,5,1e2",
      "geo: 1,5",
      "geo:Infinity,5",
      "geo:52.3731,4.8922&q=x",
    ]) {
      expect(parseGeo(code), code).toMatchObject({ coordinates: code.slice("geo:".length), mapsLink: null });
    }
  });

  it("offers no link for one number or four", () => {
    expect(parseGeo("geo:52.3731")).toEqual({ coordinates: "52.3731", place: "", search: false, mapsLink: null });
    expect(parseGeo("geo:1,2,3,4")?.mapsLink).toBeNull();
  });

  it("offers no link for Android's search form geo:0,0?q=…, and reads its place", () => {
    expect(parseGeo("geo:0,0?q=Rijksmuseum%20Amsterdam")).toEqual({
      coordinates: "0,0",
      place: "Rijksmuseum Amsterdam",
      search: true,
      mapsLink: null,
    });
    expect(parseGeo("geo:0,0?z=10&q=Dam")).toMatchObject({ search: true, mapsLink: null });
    expect(parseGeo("geo:0,0?q=")).toMatchObject({ search: true, mapsLink: null });
  });

  it("keeps the link for 0,0 written otherwise, or without q", () => {
    expect(parseGeo("geo:0,0")).toMatchObject({ search: false, mapsLink: maps("0,0") });
    expect(parseGeo("geo:0.0,0?q=x")).toMatchObject({ search: false, mapsLink: maps("0.0,0") });
    expect(parseGeo("geo:0,0?z=3")).toMatchObject({ search: false, mapsLink: maps("0,0") });
  });

  it("tells coordinates that are not valid from the search form: neither has a link", () => {
    expect(parseGeo("geo:999,0?q=Dam")).toEqual({ coordinates: "999,0", place: "Dam", search: false, mapsLink: null });
  });

  it("keeps markup in the coordinates as text", () => {
    expect(parseGeo("geo:<img src=x onerror=alert(1)>")).toEqual({
      coordinates: "<img src=x onerror=alert(1)>",
      place: "",
      search: false,
      mapsLink: null,
    });
  });

  it("reads the prefix in any case", () => {
    expect(parseGeo("GEO:52.3731,4.8922")?.mapsLink).toBe(maps("52.3731,4.8922"));
  });

  it("does not parse without coordinate text", () => {
    expect(parseGeo("geo:")).toBeNull();
    expect(parseGeo("geo:;u=35")).toBeNull();
    expect(parseGeo("geo:?q=Dam")).toBeNull();
    expect(parseGeo("https://example.com")).toBeNull();
  });
});
