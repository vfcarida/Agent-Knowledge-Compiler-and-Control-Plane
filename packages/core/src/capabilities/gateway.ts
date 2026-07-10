import type { CapabilityRequest } from './request.js';
import type { PolicyCard } from '../policy/types.js';
import { evaluatePolicy } from '../policy/evaluate.js';

export class MCPGatewayError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MCPGatewayError';
  }
}

export interface GatewayConfig {
  policies: Record<string, PolicyCard>; // Map of agentId -> PolicyCard
  defaultPolicy?: PolicyCard;
}

export class MCPGateway {
  constructor(private config: GatewayConfig) {}

  public async execute<T>(request: CapabilityRequest, executor: () => Promise<T>): Promise<T> {
    const policy = this.resolvePolicy(request.agentId);

    if (!policy) {
      throw new MCPGatewayError(`Unauthorized: No valid policy found for agent '${request.agentId || 'anonymous'}'.`, 'UNAUTHORIZED_AGENT');
    }

    // Evaluate Policy
    const evalResult = evaluatePolicy(policy, {
      toolName: request.toolName,
      sideEffect: request.sideEffect
    });

    if (!evalResult.allowed) {
      throw new MCPGatewayError(`[LLM06: Excessive Agency] Policy Violation: ${evalResult.reason}`, 'POLICY_VIOLATION');
    }

    // Output Sanitization Rules logic could be initialized here based on evalResult.requirements.piiHandling

    try {
      const result = await executor();
      
      // Post-execution sanitization
      if (evalResult.requirements?.piiHandling === 'redact') {
        return this.sanitizeOutput(result);
      }
      
      if (evalResult.requirements?.piiHandling === 'deny') {
         if (this.containsPII(result)) {
           throw new MCPGatewayError(`[LLM06: Sensitive Information] Policy Violation: PII detected in output for tool '${request.toolName}' while policy dictates 'deny'.`, 'POLICY_VIOLATION');
         }
      }

      return result;
    } catch (err: any) {
      if (err instanceof MCPGatewayError) throw err;
      throw new MCPGatewayError(`Execution Failed: ${err.message}`, 'EXECUTION_ERROR');
    }
  }

  private resolvePolicy(agentId?: string): PolicyCard | undefined {
    if (agentId && this.config.policies[agentId]) {
      return this.config.policies[agentId];
    }
    return this.config.defaultPolicy;
  }

  private sanitizeOutput<T>(output: T): T {
    const str = JSON.stringify(output);
    // Extremely basic redaction for emails/SSNs as an example
    const redacted = str
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
    return JSON.parse(redacted) as T;
  }

  private containsPII(output: any): boolean {
    const str = JSON.stringify(output);
    const hasSSN = /\b\d{3}-\d{2}-\d{4}\b/.test(str);
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(str);
    return hasSSN || hasEmail;
  }
}
