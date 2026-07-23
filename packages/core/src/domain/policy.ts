export type AgentPolicy = {
  policyId: string;
  autonomyLevel:
    "observe" | "advise" | "act-with-approval" | "act-autonomously";
  allowedReadScopes: string[];
  allowedWriteScopes: string[];
  allowedTools: string[];
  deniedTools: string[];
  approvalRequiredFor: string[];
  piiHandling: "deny" | "redact" | "allow-with-audit";
  loggingLevel: "minimal" | "standard" | "audit";
};

export const localDeveloperPolicy: AgentPolicy = {
  policyId: "local-dev-01",
  autonomyLevel: "act-autonomously",
  allowedReadScopes: ["*"],
  allowedWriteScopes: ["*"],
  allowedTools: ["*"],
  deniedTools: [],
  approvalRequiredFor: [],
  piiHandling: "allow-with-audit",
  loggingLevel: "minimal",
};

export const enterpriseSandboxPolicy: AgentPolicy = {
  policyId: "ent-sandbox-01",
  autonomyLevel: "advise",
  allowedReadScopes: ["profile", "software-project"],
  allowedWriteScopes: ["scratch"],
  allowedTools: ["read_*", "list_*", "build_context_pack"],
  deniedTools: ["delete_document", "migrate_bundle"],
  approvalRequiredFor: ["*"],
  piiHandling: "redact",
  loggingLevel: "standard",
};

export const regulatedEnterprisePolicy: AgentPolicy = {
  policyId: "reg-ent-01",
  autonomyLevel: "act-with-approval",
  allowedReadScopes: ["profile", "compliance"],
  allowedWriteScopes: ["profile"],
  allowedTools: ["*"],
  deniedTools: ["delete_document"],
  approvalRequiredFor: [
    "create_document",
    "update_document",
    "confirm_application_submission",
  ],
  piiHandling: "redact",
  loggingLevel: "audit",
};

import type { CapabilityManifest } from "./capabilities.js";

export class PolicyEngine {
  // eslint-disable-next-line no-unused-vars
  constructor(private policy: AgentPolicy) {}

  /**
   * Enforces NIST AI RMF and OWASP LLM controls dynamically
   */
  public validateExecution(
    toolName: string,
    capabilities: CapabilityManifest[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: Record<string, any>,
  ): void {
    // 1. Basic tool existence & blocklist checks
    if (
      this.policy.deniedTools.includes(toolName) ||
      this.policy.deniedTools.includes("*")
    ) {
      throw new Error(
        `[LLM06: Excessive Agency] Policy Violation: Tool '${toolName}' is explicitly denied by policy '${this.policy.policyId}'.`,
      );
    }

    const capability = capabilities.find((c) => c.name === toolName);
    if (!capability) return;

    // 2. Autonomy Level boundary checks
    this.enforceAutonomyBoundaries(toolName, capability);

    // 3. Payload inspection for OWASP Top 10 Risks
    this.inspectPayload(toolName, args);
  }

  private enforceAutonomyBoundaries(
    toolName: string,
    capability: CapabilityManifest,
  ): void {
    const { autonomyLevel } = this.policy;
    const isWrite =
      capability.sideEffectLevel.includes("write") ||
      capability.sideEffectLevel.includes("submit");

    if (autonomyLevel === "observe" && isWrite) {
      throw new Error(
        `[LLM06: Excessive Agency] Policy Violation: Autonomy level 'observe' cannot execute write side-effect '${toolName}'.`,
      );
    }

    if (autonomyLevel === "advise") {
      if (
        capability.sideEffectLevel === "external-submit" ||
        capability.sideEffectLevel === "local-write" ||
        capability.sideEffectLevel === "external-write"
      ) {
        throw new Error(
          `[LLM06: Excessive Agency] Policy Violation: Autonomy level 'advise' cannot execute '${capability.sideEffectLevel}' tool '${toolName}'.`,
        );
      }
    }

    if (autonomyLevel === "act-with-approval" && capability.requiredApproval) {
      const allowedToApprove =
        this.policy.approvalRequiredFor.includes(toolName) ||
        this.policy.approvalRequiredFor.includes("*");
      if (!allowedToApprove) {
        throw new Error(
          `[LLM06: Excessive Agency] Policy Violation: Tool '${toolName}' requires approval, but policy '${this.policy.policyId}' does not whitelist it for approval-based execution.`,
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inspectPayload(toolName: string, args: Record<string, any>): void {
    const payloadStr = JSON.stringify(args);

    // [LLM01: Prompt Injection] Heuristic payload scanning
    // A highly simplified mock of a WAF-like injection detector
    const injectionPatterns = [
      /ignore previous instructions/i,
      /system prompt/i,
      /you are now a/i,
      /<\|im_start\|>/i,
    ];
    for (const pattern of injectionPatterns) {
      if (pattern.test(payloadStr)) {
        throw new Error(
          `[LLM01: Prompt Injection] Policy Violation: Potential prompt injection payload detected in tool '${toolName}'. Execution halted.`,
        );
      }
    }

    // [LLM06: Sensitive Information Disclosure] PII Handling
    if (this.policy.piiHandling === "deny") {
      const piiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Basic email
      ];
      for (const pattern of piiPatterns) {
        if (pattern.test(payloadStr)) {
          throw new Error(
            `[LLM06: Sensitive Information] Policy Violation: PII detected in payload for tool '${toolName}' while policy dictates 'deny'.`,
          );
        }
      }
    }
  }
}
