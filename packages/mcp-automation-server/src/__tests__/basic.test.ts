import { describe, it, expect } from "vitest";
import { automationServerCapabilities } from "../capabilities.js";
import { AutomationError } from "../errors.js";

describe("mcp-automation-server basic tests", () => {
  it("should export capabilities", () => {
    expect(automationServerCapabilities).toBeDefined();
    expect(Array.isArray(automationServerCapabilities)).toBe(true);
  });

  it("should export errors", () => {
    const err = new AutomationError("LinkedIn", "login", "test error", { foo: "bar" });
    expect(err.message).toContain("test error");
    expect(err.code).toBe("AUTOMATION_ERROR");
    expect(err.details).toEqual({ platform: "LinkedIn", step: "login", foo: "bar" });
  });
});
