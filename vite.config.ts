import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tauri's dev server contract: a fixed port, and no screen clearing so Rust
// errors stay visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**", "**/core/**"] } },
  // Oldest webview is Safari 15 (macOS 12). One chunk, so no modulepreload polyfill.
  build: { target: ["safari15"], modulePreload: { polyfill: false } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Tests read src/*.css as text (?raw); vitest blanks CSS unless asked.
    css: { include: [/\.css/] },
  },
});
