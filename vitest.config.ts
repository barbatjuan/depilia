import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    // Integration tests share one real local Postgres instance and use
    // FOR UPDATE locks + truncate-based fixtures — files must never run
    // concurrently with each other or they deadlock/race on shared rows.
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./tests/setup-integration.ts"],
          include: ["tests/integration/**/*.test.ts"],
          // Integration tests hit a real local Postgres via `supabase start`
          // and use FOR UPDATE locks — never run them concurrently.
          sequence: { concurrent: false },
          poolOptions: { threads: { singleThread: true } },
        },
      },
    ],
  },
});
