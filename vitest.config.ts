import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/core/src/**/*.ts',
        'packages/mcp-profile-server/src/**/*.ts',
        'packages/mcp-automation-server/src/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/dist/**',
        '**/node_modules/**',
        'packages/cli/**',
        'packages/dashboard/**',
        'packages/evals/**',
        'packages/test-fixtures/**',
        'packages/**/index.ts',
        'packages/**/index-sse.ts',
        'packages/**/http-server.ts',
      ],
      // Thresholds are enforced in CI. Ratchet up after adding tests, never down.
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 65,
        lines: 65,
      },
    },
    benchmark: {
      reporters: ['default'],
    },
  },
});
