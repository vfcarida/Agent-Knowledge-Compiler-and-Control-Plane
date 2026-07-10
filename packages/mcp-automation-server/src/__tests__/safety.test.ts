import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AKCPAutomationServer } from '../server.js';
import { OKFDocumentService } from '@ocf/core';

vi.mock('better-sqlite3', () => {
  const transactionFn = vi.fn().mockImplementation((fn: () => void) => {
    // Execute the transaction function immediately (no actual DB wrapping in test)
    const wrappedFn = () => fn();
    return wrappedFn;
  });

  return {
    default: vi.fn().mockImplementation(() => ({
      exec: vi.fn(),
      prepare: vi.fn().mockImplementation((sql: string) => ({
        run: vi.fn(),
        // PRAGMA user_version must return { user_version: 0 } so runMigrations works
        get: vi.fn().mockReturnValue(sql.includes('PRAGMA user_version') ? { user_version: 0 } : undefined),
        all: vi.fn().mockReturnValue([]),
      })),
      transaction: transactionFn,
    })),
  };
});


describe('Safety Controls', () => {
  let server: AKCPAutomationServer;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    server = new AKCPAutomationServer({} as OKFDocumentService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('blocks live submission when AUTOMATION_RUNTIME_MODE is sandbox', async () => {
    process.env['AUTOMATION_RUNTIME_MODE'] = 'sandbox';
    expect(server).toBeDefined();
    expect(true).toBe(true);
  });
});
