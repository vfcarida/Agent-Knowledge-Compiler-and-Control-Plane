import { describe, it, expect } from "vitest";
import {
  InternalPolicyProvider,
  CedarPolicyProvider,
  OPAPolicyProvider,
} from "../index.js";
import type { PolicyProvider } from "../index.js";

describe("PolicyProvider interface & exports", () => {
  it("InternalPolicyProvider implements full interface", () => {
    const provider: PolicyProvider = new InternalPolicyProvider();
    expect(provider.evaluate).toBeDefined();
    expect(provider.explain).toBeDefined();
    expect(provider.reload).toBeDefined();
    expect(provider.healthy).toBeDefined();
  });

  it("CedarPolicyProvider and OPAPolicyProvider are exported from core index", () => {
    const cedar = new CedarPolicyProvider({ endpoint: "http://cedar.test" });
    expect(cedar.evaluate).toBeDefined();
    expect(cedar.healthy).toBeDefined();

    const opa = new OPAPolicyProvider({ endpoint: "http://opa.test" });
    expect(opa.evaluate).toBeDefined();
    expect(opa.healthy).toBeDefined();
  });
});
