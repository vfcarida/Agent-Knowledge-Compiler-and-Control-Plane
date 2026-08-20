import type { AgentKnowledgeIR } from "../ir/types.js";
import type { PolicyCard } from "./types.js";
import { PolicyCardSchema } from "./schema.js";

function isPolicyCardCandidate(
  value: unknown,
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj["kind"] === "PolicyCard" ||
    "spec" in obj ||
    "rules" in obj ||
    "appliesTo" in obj ||
    (typeof obj["metadata"] === "object" &&
      obj["metadata"] !== null &&
      "name" in (obj["metadata"] as Record<string, unknown>))
  );
}

/**
 * Safely extracts and transforms gateway-compatible PolicyCard objects from an AgentKnowledgeIR envelope.
 *
 * It extracts explicit PolicyCard objects stored under `ir.policies`, filters out standard IR metadata
 * scalar fields, and synthesizes a default PolicyCard if top-level organizational defaults are declared.
 *
 * @param ir - The AgentKnowledgeIR envelope (or undefined/null)
 * @returns A record mapping agent/policy names to validated PolicyCard objects
 */
export function extractGatewayPolicies(
  ir?: AgentKnowledgeIR | null,
): Record<string, PolicyCard> {
  if (!ir || !ir.policies || typeof ir.policies !== "object") {
    return {};
  }

  const result: Record<string, PolicyCard> = {};
  const metadataKeys = new Set([
    "defaultAutonomyLevel",
    "piiHandling",
    "disableDangerousTools",
    "requireApprovalFor",
    "policies",
  ]);

  for (const [key, value] of Object.entries(ir.policies)) {
    if (metadataKeys.has(key)) {
      continue;
    }

    if (isPolicyCardCandidate(value)) {
      const parseResult = PolicyCardSchema.safeParse(value);
      if (parseResult.success) {
        result[key] = parseResult.data;
      }
    }
  }

  // Synthesize default policy from organizational policy settings if present and no explicit default is defined
  const hasOrgDefaults =
    ir.policies.defaultAutonomyLevel !== undefined ||
    ir.policies.piiHandling !== undefined ||
    ir.policies.disableDangerousTools !== undefined ||
    (Array.isArray(ir.policies.requireApprovalFor) &&
      ir.policies.requireApprovalFor.length > 0);

  if (hasOrgDefaults && !result["default"]) {
    const rawPii = ir.policies.piiHandling;
    const piiHandling: "deny" | "redact" | "allow-with-audit" =
      rawPii === "redact" || rawPii === "deny" || rawPii === "allow-with-audit"
        ? rawPii
        : "deny";

    result["default"] = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: {
        name: "ir-default-policy",
        description:
          "Synthesized default policy from IR organizational policy settings",
        version: "1.0.0",
      },
      spec: {
        allowedAgents: ["*"],
        allowedContextPacks: ["*"],
        allowedTools: ["*"],
        forbiddenTools: [],
        approvalRequirements: Array.isArray(ir.policies.requireApprovalFor)
          ? ir.policies.requireApprovalFor
          : [],
        piiHandling,
      },
    };
  }

  return result;
}
