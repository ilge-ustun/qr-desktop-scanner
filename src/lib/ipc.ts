// The only place the page talks to Rust. Types mirror qr-core's ScanOutcome
// (serde: tag "kind", camelCase).
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export type DecodedCode = { text: string; format: string };

export type ScanOutcome =
  | { kind: "found"; codes: DecodedCode[] }
  | { kind: "notFound" }
  | { kind: "cancelled" }
  | { kind: "permissionDenied" }
  | { kind: "error"; message: string };

export const startScan = () => invoke<void>("start_scan");
export const screenPermission = () => invoke<boolean>("screen_permission");
export const openScreenSettings = () => invoke<void>("open_screen_settings");
export const openLink = (url: string) => invoke<void>("open_link", { url });
export const hidePopover = () => invoke<void>("hide_popover");
export const copyText = (text: string) => writeText(text);
export const fitPopover = (height: number) => invoke<void>("fit_popover", { height });
export const joinWifi = (ssid: string, password: string) =>
  invoke<void>("join_wifi", { ssid, password: password || null });

/** Scans started anywhere (button, hotkey, tray menu) report here. */
export async function onScan(handlers: {
  started: () => void;
  result: (outcome: ScanOutcome) => void;
}): Promise<UnlistenFn> {
  const unlisten = await Promise.all([
    listen("scan://started", () => handlers.started()),
    listen<ScanOutcome>("scan://result", (event) => handlers.result(event.payload)),
  ]);
  return () => unlisten.forEach((u) => u());
}
