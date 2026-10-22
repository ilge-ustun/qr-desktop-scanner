// The popover's webview gets three Tauri permissions and a CSP that names
// base-uri, form-action and object-src. These tests read the config files;
// they do not show that Tauri enforces them.
import { describe, expect, it } from "vitest";

import capabilityRaw from "../../src-tauri/capabilities/default.json?raw";
import confRaw from "../../src-tauri/tauri.conf.json?raw";

const capability = JSON.parse(capabilityRaw) as Record<string, unknown>;
const conf = JSON.parse(confRaw) as { app: { security: Record<string, unknown> } };

/** Parsed as tauri-utils does: split on ';', trim, split on single spaces. */
function directives(csp: string): [string, string[]][] {
  return csp
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((p) => {
      const [name, ...sources] = p.split(" ");
      return [name, sources];
    });
}

describe("AC1 capability", () => {
  it("grants exactly the three permissions to main", () => {
    expect([...(capability.permissions as string[])].sort()).toEqual([
      "clipboard-manager:allow-write-text",
      "core:event:allow-listen",
      "core:event:allow-unlisten",
    ]);
    expect(capability.windows).toEqual(["main"]);
    expect(Object.keys(capability).sort()).toEqual(
      ["$schema", "description", "identifier", "permissions", "windows"],
    );
  });
});

describe("AC2 csp", () => {
  const csp = conf.app.security.csp;
  it("is a string", () => {
    expect(typeof csp).toBe("string");
  });
  const parsed = directives(typeof csp === "string" ? csp : "");
  it("names no directive twice and only the seven", () => {
    const names = parsed.map(([n]) => n);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(
      ["base-uri", "connect-src", "default-src", "form-action", "img-src", "object-src", "style-src"],
    );
  });
  it("has each directive's sources in order", () => {
    expect(Object.fromEntries(parsed)).toEqual({
      "default-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["ipc:", "http://ipc.localhost"],
      "base-uri": ["'none'"],
      "form-action": ["'none'"],
      "object-src": ["'none'"],
    });
  });
});

describe("AC3 single source", () => {
  it("has only default.json under capabilities", () => {
    const files = Object.keys(import.meta.glob("../../src-tauri/capabilities/**/*", { eager: false }));
    expect(files.map((f) => f.split("/").pop())).toEqual(["default.json"]);
  });
  it("has only csp in app.security", () => {
    expect(Object.keys(conf.app.security)).toEqual(["csp"]);
  });
});
