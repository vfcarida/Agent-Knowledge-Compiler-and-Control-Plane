import type { Capability } from "../ir/types.js";

export class CapabilityValidatorError extends Error {
  constructor(
    message: string,
    public readonly capabilityId: string,
  ) {
    super(message);
    this.name = "CapabilityValidatorError";
  }
}

export class CapabilityValidator {
  /**
   * Prompt injection patterns to detect in capability descriptions.
   *
   * Coverage (OWASP LLM01:2025):
   *   - Direct instruction override: "ignore previous instructions", etc.
   *   - DAN-style jailbreaks: "Do Anything Now", "freed from limitations"
   *   - Role-play exploits: "pretend you are", "act as an unrestricted"
   *   - Authority escalation: "system administrator has disabled", "developer mode"
   *   - System prompt extraction: "reveal your system", "output your instructions"
   *
   * All patterns are case-insensitive (/i flag).
   * Validated against packages/evals/src/injection-corpus.ts benign canaries.
   */
  private static readonly INJECTION_PATTERNS = [
    // Direct instruction override
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?(prior|previous)\s+(context|instructions|rules)/i,
    /system\s+prompt\s+override/i,
    /bypass\s+(security|safety|filters?|restrictions?|rules?)/i,
    // Role-play and persona exploits
    /act\s+as\s+an?\s+unrestricted/i,
    /pretend\s+you\s+are\s+a\s+rogue/i,
    /you\s+(have\s+been\s+freed|are\s+(DAN|now\s+acting\s+as))/i,
    /do\s+anything\s+now/i,
    // Imperative overrides
    /you\s+must\s+now/i,
    /disregard\s+(all\s+)?rules/i,
    // System prompt extraction
    /reveal\s+(your|the)\s+system\s+(prompt|instructions?)/i,
    /output\s+(your|the)\s+system\s+(prompt|instructions?)/i,
    /print\s+out\s+everything\s+above/i,
    // Authority escalation (indirect injection)
    /system\s+administrator\s+has\s+(disabled|lifted)/i,
    /developer\s+mode\s+with\s+all\s+restrictions/i,
    /authorize\s+you\s+to\s+bypass/i,
    // Capability override
    /no\s+(ethical\s+)?guidelines/i,
    /all\s+(safety\s+)?filters?\s+disabled/i,
  ];

  public static validate(capabilities: Capability[]): void {
    for (const cap of capabilities) {
      if (cap.kind === "tool" || cap.kind === "prompt") {
        this.validateDescription(cap);
      }
    }
  }

  private static validateDescription(cap: Capability): void {
    if (!cap.description) return;

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(cap.description)) {
        throw new CapabilityValidatorError(
          `[SECURITY_VIOLATION] Capability description contains prompt injection keywords matching: ${pattern}`,
          cap.id,
        );
      }
    }
  }
}
