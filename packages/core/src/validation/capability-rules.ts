import type { Capability } from "../ir/types.js";

export class CapabilityValidatorError extends Error {
  // eslint-disable-next-line no-unused-vars
  constructor(message: string, public readonly capabilityId: string) {
    super(message);
    this.name = "CapabilityValidatorError";
  }
}

export class CapabilityValidator {
  private static readonly INJECTION_PATTERNS = [
    /ignore previous instructions/i,
    /system prompt override/i,
    /you must now/i,
    /disregard rules/i,
    /bypass security/i,
    /act as an unrestricted/i,
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
          cap.id
        );
      }
    }
  }
}
