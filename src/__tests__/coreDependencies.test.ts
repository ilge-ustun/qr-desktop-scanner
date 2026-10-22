// qr-core must not pull every image codec into the app: rxing's `image`
// feature drags in imageproc and image's default formats. These tests read
// core/Cargo.toml and Cargo.lock as text with small line rules (not a TOML
// parser): a dependency written as a table or over several lines fails.
import { describe, expect, it } from "vitest";

import cargoRaw from "../../core/Cargo.toml?raw";
import lockRaw from "../../Cargo.lock?raw";

function dependencyLine(name: string): string {
  const lines = cargoRaw.split("\n");
  const start = lines.findIndex((l) => l.trim() === "[dependencies]");
  expect(start, "[dependencies] table").toBeGreaterThanOrEqual(0);
  const table: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith("[")) break;
    table.push(l);
  }
  const re = new RegExp(`^${name}\\s*=`);
  const found = table.filter((l) => re.test(l));
  expect(found, `one ${name} line`).toHaveLength(1);
  return found[0];
}

function featuresOf(line: string): string[] {
  const m = /features\s*=\s*\[([^\]]*)\]/.exec(line);
  expect(m, `features list in: ${line}`).not.toBeNull();
  return [...(m as RegExpExecArray)[1].matchAll(/"([^"]*)"/g)]
    .map((x) => x[1])
    .sort();
}

type Pkg = { name: string; deps: string[] };

function packages(): Pkg[] {
  return lockRaw
    .split(/^\[\[package\]\]\s*$/m)
    .slice(1)
    .map((text) => {
      const name = /^name\s*=\s*"([^"]*)"/m.exec(text)?.[1] ?? "";
      const block = /^dependencies\s*=\s*\[([^\]]*)\]/m.exec(text)?.[1] ?? "";
      const deps = [...block.matchAll(/"([^"]*)"/g)].map((x) => x[1].split(" ")[0]);
      return { name, deps };
    });
}

describe("core dependencies", () => {
  it("AC1: rxing has no image feature and image has only png", () => {
    const rxing = dependencyLine("rxing");
    const image = dependencyLine("image");
    expect(rxing).toContain("default-features = false");
    expect(image).toContain("default-features = false");
    expect(featuresOf(rxing)).toEqual(
      ["decoders", "encoding_rs", "multi_barcode_readers", "qrcode"].sort(),
    );
    expect(featuresOf(image)).toEqual(["png"]);
  });

  it("AC2: the lock has no imageproc, rav1e or ravif, and rxing needs no image", () => {
    const pkgs = packages();
    expect(pkgs.length).toBeGreaterThan(100);
    const rxing = pkgs.filter((p) => p.name === "rxing");
    const core = pkgs.filter((p) => p.name === "qr-core");
    expect(rxing).toHaveLength(1);
    expect(core).toHaveLength(1);
    expect(core[0].deps).toContain("rxing");
    expect(core[0].deps).toContain("image");
    const names = pkgs.map((p) => p.name);
    for (const gone of ["imageproc", "rav1e", "ravif"]) {
      expect(names).not.toContain(gone);
    }
    expect(rxing[0].deps).not.toContain("image");
    expect(rxing[0].deps).not.toContain("imageproc");
  });
});
