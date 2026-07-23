import type { PolicyCard } from "./types.js";

export function explainPolicy(policy: PolicyCard): string {
  const spec = policy.spec;
  const metadata = policy.metadata || { name: "Unnamed Policy" };
  const lines: string[] = [];

  lines.push(`Policy Name: ${metadata.name}`);
  if (metadata.description) {
    lines.push(`Description: ${metadata.description}`);
  }
  lines.push(`Version: ${metadata.version || "v1"}`);
  lines.push("");

  if (policy.appliesTo) {
    lines.push("--- Applies To ---");
    lines.push(`Capabilities: ${policy.appliesTo.capabilities.join(", ")}`);
    lines.push("");
  }

  if (policy.rules && policy.rules.length > 0) {
    lines.push("--- Rules ---");
    for (const rule of policy.rules) {
      lines.push(`- Effect: ${rule.effect}${rule.condition ? ` (if: ${rule.condition})` : ""}`);
    }
    lines.push("");
  }

  if (spec) {
    lines.push("--- Access Rules (V1) ---");
    lines.push(`Allowed Agents: ${spec.allowedAgents?.join(", ") || "*"}`);
    lines.push(`Allowed Tools: ${spec.allowedTools?.join(", ") || "*"}`);
    if (spec.forbiddenTools && spec.forbiddenTools.length > 0) {
      lines.push(`Forbidden Tools: ${spec.forbiddenTools.join(", ")}`);
    }
    lines.push("");

    lines.push("--- Side Effects (V1) ---");
    const se = spec.sideEffectRules || {
      read: "allow",
      write: "approval",
      submit: "approval",
    };
    lines.push(`Read Actions: ${se.read}`);
    lines.push(`Write Actions: ${se.write}`);
    lines.push(`Submit Actions: ${se.submit}`);
    lines.push("");

    lines.push("--- Requirements (V1) ---");
    lines.push(`PII Handling: ${spec.piiHandling || "deny"}`);
    if (spec.approvalRequirements && spec.approvalRequirements.length > 0) {
      lines.push(
        `Explicit Approval For: ${spec.approvalRequirements.join(", ")}`,
      );
    }
    if (spec.evidenceRequirements && spec.evidenceRequirements.length > 0) {
      lines.push(`Evidence Required: ${spec.evidenceRequirements.join(", ")}`);
    }
    lines.push("");

    if (spec.mappings) {
      lines.push("--- Framework Mappings (V1) ---");
      if (spec.mappings.nist_ai_rmf) {
        lines.push(`NIST AI RMF: ${spec.mappings.nist_ai_rmf.join(", ")}`);
      }
      if (spec.mappings.owasp_llm) {
        lines.push(`OWASP LLM Top 10: ${spec.mappings.owasp_llm.join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}
