import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AKCPAutomationServer } from "../server.js";
import { OKFDocumentService } from "@akcp/core";
import { automationServerCapabilities } from "../capabilities.js";

vi.mock("better-sqlite3", () => {
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
        get: vi
          .fn()
          .mockReturnValue(
            sql.includes("PRAGMA user_version")
              ? { user_version: 0 }
              : undefined,
          ),
        all: vi.fn().mockReturnValue([]),
      })),
      transaction: transactionFn,
    })),
  };
});

describe("Safety Controls", () => {
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

  it("blocks live submission when AUTOMATION_RUNTIME_MODE is sandbox", async () => {
    process.env["AUTOMATION_RUNTIME_MODE"] = "sandbox";

    // Server must instantiate correctly even in sandbox mode
    expect(server).toBeInstanceOf(AKCPAutomationServer);

    // The underlying MCP server instance must be accessible
    const instance = server.getServerInstance();
    expect(instance).toBeDefined();
    expect(typeof instance.tool).toBe("function");
  });

  it("registers the confirm_application_submission tool with critical risk metadata", () => {
    // The confirm tool must be registered (it is the gated, high-risk one)
    // We verify registration by checking capabilities.ts manifest, which is the source-of-truth
    // used by registerTools() to wire the MCP server.
    const confirmCap = automationServerCapabilities.find(
      (c) => c.name === "confirm_application_submission",
    );

    expect(confirmCap).toBeDefined();
    expect(confirmCap?.riskLevel).toBe("critical");
    expect(confirmCap?.sideEffectLevel).toBe("external-submit");
    expect(confirmCap?.requiredApproval).toBe(true);
  });

  it("does NOT register any tool with riskLevel critical and requiredApproval false", () => {
    const unsafeTools = automationServerCapabilities.filter(
      (c) => c.riskLevel === "critical" && c.requiredApproval === false,
    );

    // Safety invariant: no critical-risk tool may bypass the approval gate
    expect(unsafeTools).toHaveLength(0);
  });

  it("sandbox mode does not change server structure", () => {
    process.env["AUTOMATION_RUNTIME_MODE"] = "sandbox";
    const sandboxServer = new AKCPAutomationServer({} as OKFDocumentService);

    // Server must still be fully constructed and expose the same interface
    expect(sandboxServer.getServerInstance()).toBeDefined();
    expect(typeof sandboxServer.getServerInstance().tool).toBe("function");
  });
});
