import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // RTL's automatic DOM cleanup between tests hooks into a global afterEach.
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
