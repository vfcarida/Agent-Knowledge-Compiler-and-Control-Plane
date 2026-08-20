import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "packages/core/src/**/*.ts",
        "packages/mcp-profile-server/src/**/*.ts",
        "packages/mcp-automation-server/src/**/*.ts",
      ],
      exclude: [
        "**/__tests__/**",
        "**/__benchmarks__/**",
        "**/dist/**",
        "**/node_modules/**",
        "packages/cli/**",
        "packages/core/src/cli/**",
        "packages/dashboard/**",
        "packages/evals/**",
        "packages/test-fixtures/**",
        "packages/**/index.ts",
        "packages/**/index-sse.ts",
        "packages/**/http-server.ts",
      ],
      // Thresholds are enforced in CI. Ratchet up after adding tests, never down.
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    benchmark: {
      reporters: ["default"],
    },
  },
});
