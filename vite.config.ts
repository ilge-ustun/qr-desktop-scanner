import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tauri's dev server contract: a fixed port, and no screen clearing so Rust
// errors stay visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**", "**/core/**"] } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
