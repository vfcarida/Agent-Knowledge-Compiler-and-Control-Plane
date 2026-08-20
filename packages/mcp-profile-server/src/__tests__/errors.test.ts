import { describe, it, expect } from "vitest";
import {
  AKCPMCPError,
  MCPToolExecutionError,
  PlatformNotSupportedError,
  AutomationError,
} from "../errors.js";

describe("MCP Profile Server Errors", () => {
  it("instantiates base AKCPMCPError and serializes to JSON", () => {
    const err = new AKCPMCPError("Base error", "ERR_BASE", { info: 123 });
    expect(err.name).toBe("AKCPMCPError");
    expect(err.code).toBe("ERR_BASE");
    expect(err.details).toEqual({ info: 123 });

    const json = err.toJSON();
    expect(json).toEqual({
      error: "AKCPMCPError",
      code: "ERR_BASE",
      message: "Base error",
      details: { info: 123 },
    });
  });

  it("instantiates MCPToolExecutionError with toolName details", () => {
    const err = new MCPToolExecutionError("read_document", "Not found");
    expect(err.name).toBe("MCPToolExecutionError");
    expect(err.code).toBe("MCP_TOOL_EXECUTION_ERROR");
    expect(err.message).toContain("MCP Tool [read_document] failed: Not found");
    expect(err.details?.toolName).toBe("read_document");
  });

  it("instantiates PlatformNotSupportedError", () => {
    const err = new PlatformNotSupportedError("https://example.com/jobs/1");
    expect(err.name).toBe("PlatformNotSupportedError");
    expect(err.code).toBe("PLATFORM_NOT_SUPPORTED");
    expect(err.message).toContain("https://example.com/jobs/1");
  });

  it("instantiates AutomationError with step context", () => {
    const err = new AutomationError(
      "LinkedIn",
      "login",
      "Timeout waiting for selector",
    );
    expect(err.name).toBe("AutomationError");
    expect(err.code).toBe("AUTOMATION_ERROR");
    expect(err.message).toContain(
      "Browser automation failed on [LinkedIn] during step [login]",
    );
    expect(err.details?.platform).toBe("LinkedIn");
    expect(err.details?.step).toBe("login");
  });
});
