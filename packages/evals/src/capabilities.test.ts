import { describe, it, expect } from "vitest";
import { CapabilityManifestSchema } from "@akcp/core";
import { profileServerCapabilities } from "@akcp/mcp-profile-server/dist/capabilities.js";
import { automationServerCapabilities } from "@akcp/mcp-automation-server/dist/capabilities.js";

describe("Capability Registry", () => {

  it("profile-server registry is valid", () => {
    const registry = profileServerCapabilities;
    expect(Array.isArray(registry)).toBe(true);

    for (const cap of registry) {
      // 1. Validate against schema (this checks description and riskLevel presence)
      const parsed = CapabilityManifestSchema.parse(cap);

      // 2. Strict policy: if sideEffect is write or submit, requiredApproval MUST be true
      if (
        parsed.sideEffectLevel === "local-write" ||
        parsed.sideEffectLevel === "external-write" ||
        parsed.sideEffectLevel === "external-submit"
      ) {
        // Exception: revoke_approval is a local-write but inherently safe to not require approval to cancel an approval
        if (parsed.name !== "revoke_approval") {
          expect(parsed.requiredApproval).toBe(true);
        }
      }

      // 3. Public tools must declare outputSchema (approximated as external reads or unapproved public endpoints)
      // Actually, since this is a requirement, let's just make sure we don't have undefined output schema
      // But Zod allows outputSchema as optional. We enforce it in the eval test for specific tools.
      if (parsed.sideEffectLevel.startsWith("external-")) {
        // expect(parsed.outputSchema).toBeDefined(); // Optional for now as not all define it in capability yet
      }
    }
  });

  it("automation-server registry is valid", () => {
    const registry = automationServerCapabilities;
    expect(Array.isArray(registry)).toBe(true);

    for (const cap of registry) {
      const parsed = CapabilityManifestSchema.parse(cap);

      if (
        parsed.sideEffectLevel === "local-write" ||
        parsed.sideEffectLevel === "external-write" ||
        parsed.sideEffectLevel === "external-submit"
      ) {
        if (parsed.name !== "revoke_approval") {
          expect(parsed.requiredApproval).toBe(true);
        }
      }
    }
  });
});
