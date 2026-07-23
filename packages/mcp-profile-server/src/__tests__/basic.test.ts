import { describe, it, expect } from "vitest";
import { profileServerCapabilities } from "../capabilities.js";
import { AKCPMCPError } from "../errors.js";

describe("mcp-profile-server basic tests", () => {
  it("should export capabilities", () => {
    expect(profileServerCapabilities).toBeDefined();
    expect(Array.isArray(profileServerCapabilities)).toBe(true);
  });

  it("should export errors", () => {
    const err = new AKCPMCPError("test error", "TEST_CODE", { foo: "bar" });
    expect(err.message).toBe("test error");
    expect(err.code).toBe("TEST_CODE");
    expect(err.details).toEqual({ foo: "bar" });
  });
});
