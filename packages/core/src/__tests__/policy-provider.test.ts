import { describe, it, expect, vi } from "vitest";
import { InternalPolicyProvider } from "../policies/internal-provider.js";
import type { PolicyProvider } from "../policies/provider.js";

describe("PolicyProvider interface", () => {
  it("InternalPolicyProvider implements full interface", () => {
    const provider = new InternalPolicyProvider();
    expect(provider.evaluate).toBeDefined();
    expect(provider.explain).toBeDefined();
    expect(provider.reload).toBeDefined();
    expect(provider.healthy).toBeDefined();
  });
});
