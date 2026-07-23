import { describe, it, expect } from "vitest";
import { profileServerCapabilities } from "../capabilities.js";

const REQUIRED_TOOLS = ["validate_bundle", "migrate_bundle", "rebuild_indexes"];

const WRITE_TOOLS_REQUIRING_APPROVAL = [
  "create_document",
  "update_document",
  "delete_document",
  "migrate_bundle",
  "rebuild_indexes",
];

describe("Profile Server MCP Contracts", () => {
  it("exports a non-empty capabilities array", () => {
    expect(Array.isArray(profileServerCapabilities)).toBe(true);
    expect(profileServerCapabilities.length).toBeGreaterThan(0);
  });

  it("exposes all required tools", () => {
    const names = profileServerCapabilities.map((c) => c.name);
    for (const tool of REQUIRED_TOOLS) {
      expect(names).toContain(tool);
    }
  });

  it("every capability has a valid id, name, kind, riskLevel and sideEffectLevel", () => {
    const validKinds = ["tool", "resource", "prompt"];
    const validRiskLevels = ["low", "medium", "high", "critical"];
    const validSideEffects = [
      "none",
      "local-read",
      "local-write",
      "external-read",
      "external-write",
      "external-submit",
    ];

    for (const cap of profileServerCapabilities) {
      expect(cap.id, `${cap.name}.id`).toMatch(/^akcp\./);
      expect(cap.name, `${cap.name}.name`).toBeTruthy();
      expect(cap.kind, `${cap.name}.kind`).toSatisfy((k: string) =>
        validKinds.includes(k),
      );
      expect(cap.riskLevel, `${cap.name}.riskLevel`).toSatisfy((r: string) =>
        validRiskLevels.includes(r),
      );
      expect(cap.sideEffectLevel, `${cap.name}.sideEffectLevel`).toSatisfy(
        (s: string) => validSideEffects.includes(s),
      );
      expect(cap.description, `${cap.name}.description`).toContain(
        "When to use:",
      );
    }
  });

  it("all local-write and external-write tools require approval", () => {
    const writeCaps = profileServerCapabilities.filter(
      (c) =>
        c.sideEffectLevel === "local-write" ||
        c.sideEffectLevel === "external-write" ||
        c.sideEffectLevel === "external-submit",
    );
    for (const cap of writeCaps) {
      expect(
        cap.requiredApproval,
        `${cap.name} is a write tool and must requireApproval`,
      ).toBe(true);
    }
  });

  it("specific write tools that change state each require approval", () => {
    const names = profileServerCapabilities.map((c) => c.name);
    for (const tool of WRITE_TOOLS_REQUIRING_APPROVAL) {
      expect(names, `${tool} must be in capabilities`).toContain(tool);
      const cap = profileServerCapabilities.find((c) => c.name === tool)!;
      expect(cap.requiredApproval, `${tool}.requiredApproval`).toBe(true);
    }
  });

  it("read-only tools (low risk) do NOT require approval", () => {
    const readOnlyCaps = profileServerCapabilities.filter(
      (c) => c.sideEffectLevel === "local-read" || c.sideEffectLevel === "none",
    );
    for (const cap of readOnlyCaps) {
      expect(
        cap.requiredApproval,
        `${cap.name} is read-only and should NOT requireApproval`,
      ).toBeFalsy();
    }
  });

  it("no two capabilities share the same id", () => {
    const ids = profileServerCapabilities.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("no two capabilities share the same name", () => {
    const names = profileServerCapabilities.map((c) => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
