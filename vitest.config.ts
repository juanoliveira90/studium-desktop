import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Only this checkout's tests — not copies inside .claude/worktrees.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    // RTL's automatic DOM cleanup between tests hooks into a global afterEach.
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Node ≥25 puts an experimental localStorage getter on globalThis that
    // yields undefined without --localstorage-file; its presence stops the
    // jsdom environment from installing jsdom's working localStorage. Drop
    // Node's in the test workers so jsdom's comes through.
    execArgv: ["--no-experimental-webstorage"],
  },
});
