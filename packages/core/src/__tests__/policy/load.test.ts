import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadPolicy } from "../../policy/load.js";
import fs from "node:fs/promises";
import path from "node:path";

describe("Policy Loader", () => {
  const testDir = path.resolve(process.cwd(), "dist/test-policies");
  const validPolicyPath = path.join(testDir, "valid.policy.yaml");
  const invalidPolicyPath = path.join(testDir, "invalid.policy.yaml");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });

    await fs.writeFile(
      validPolicyPath,
      `
apiVersion: policy.akcp.dev/v1alpha1
kind: PolicyCard
metadata:
  name: Test Policy
spec:
  allowedAgents: ["*"]
  allowedContextPacks: ["*"]
  allowedTools: ["*"]
  forbiddenTools: ["delete_document"]
  sideEffectRules:
    read: allow
    write: approval
    submit: deny
`,
      "utf-8",
    );

    await fs.writeFile(
      invalidPolicyPath,
      `
apiVersion: policy.akcp.dev/v1alpha1
kind: PolicyCard
metadata:
  name: Test Policy
spec:
  # Missing required fields that do not have defaults or breaking type schema
  maxContextBudget: "should be number"
`,
      "utf-8",
    );
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should load a valid policy YAML and apply defaults", () => {
    const policy = loadPolicy(validPolicyPath);
    expect(policy.metadata.name).toBe("Test Policy");
    expect(policy.spec.forbiddenTools).toContain("delete_document");
    expect(policy.spec.approvalRequirements).toEqual([]); // defaulted
    expect(policy.spec.piiHandling).toBe("deny"); // defaulted
  });

  it("should throw PolicyLoadError for invalid schema", () => {
    expect(() => loadPolicy(invalidPolicyPath)).toThrow(
      /Policy validation failed/,
    );
  });
});
