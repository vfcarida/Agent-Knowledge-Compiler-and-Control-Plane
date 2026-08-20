import { describe, it, expect } from "vitest";
import {
  AKCPMCPError,
  MCPToolExecutionError,
  PlatformNotSupportedError,
  AutomationError,
} from "../errors.js";

describe("MCP Automation Server Errors", () => {
  it("instantiates base AKCPMCPError and serializes to JSON", () => {
    const err = new AKCPMCPError("Base automation error", "ERR_AUTO", {
      trace: "abc",
    });
    expect(err.name).toBe("AKCPMCPError");
    expect(err.code).toBe("ERR_AUTO");
    expect(err.details).toEqual({ trace: "abc" });

    const json = err.toJSON();
    expect(json).toEqual({
      error: "AKCPMCPError",
      code: "ERR_AUTO",
      message: "Base automation error",
      details: { trace: "abc" },
    });
  });

  it("instantiates MCPToolExecutionError with toolName details", () => {
    const err = new MCPToolExecutionError("apply_to_job", "Session crashed");
    expect(err.name).toBe("MCPToolExecutionError");
    expect(err.code).toBe("MCP_TOOL_EXECUTION_ERROR");
    expect(err.message).toContain(
      "MCP Tool [apply_to_job] failed: Session crashed",
    );
    expect(err.details?.toolName).toBe("apply_to_job");
  });

  it("instantiates PlatformNotSupportedError", () => {
    const err = new PlatformNotSupportedError("https://unsupported.com/job");
    expect(err.name).toBe("PlatformNotSupportedError");
    expect(err.code).toBe("PLATFORM_NOT_SUPPORTED");
    expect(err.message).toContain("https://unsupported.com/job");
  });

  it("instantiates AutomationError with step details", () => {
    const err = new AutomationError("Gupy", "upload_cv", "File upload failed");
    expect(err.name).toBe("AutomationError");
    expect(err.code).toBe("AUTOMATION_ERROR");
    expect(err.message).toContain(
      "Browser automation failed on [Gupy] during step [upload_cv]",
    );
    expect(err.details?.platform).toBe("Gupy");
    expect(err.details?.step).toBe("upload_cv");
  });
});
