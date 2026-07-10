import type { PolicyCard, PolicyEvaluationResult } from './types.js';

export interface PolicyContext {
  toolName: string;
  sideEffect: 'read' | 'write' | 'submit';
}

export function evaluatePolicy(policy: PolicyCard, context: PolicyContext): PolicyEvaluationResult {
  const spec = policy.spec;

  // 1. Check if tool is explicitly forbidden
  if (spec.forbiddenTools.includes('*') || spec.forbiddenTools.includes(context.toolName)) {
    return {
      allowed: false,
      reason: `Tool '${context.toolName}' is explicitly forbidden by policy '${policy.metadata.name}'.`
    };
  }

  // 2. Check if tool is allowed
  const isAllowed = spec.allowedTools.includes('*') || spec.allowedTools.includes(context.toolName);
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Tool '${context.toolName}' is not in the allowed list of policy '${policy.metadata.name}'.`
    };
  }

  // 3. Side Effect rules
  const sideEffectRules = spec.sideEffectRules || { read: 'allow', write: 'approval', submit: 'approval' };
  const rule = sideEffectRules[context.sideEffect] || 'deny';

  if (rule === 'deny') {
    return {
      allowed: false,
      reason: `Side-effect level '${context.sideEffect}' is denied by policy '${policy.metadata.name}'.`
    };
  }

  const approvalRequiredByRule = (rule === 'approval');
  const approvalRequiredByList = spec.approvalRequirements.includes('*') || spec.approvalRequirements.includes(context.toolName);
  
  const requiresApproval = approvalRequiredByRule || approvalRequiredByList;

  return {
    allowed: true, // It is allowed, but possibly with requirements
    requirements: {
      approvalRequired: requiresApproval,
      evidenceRequired: spec.evidenceRequirements || [],
      piiHandling: spec.piiHandling
    }
  };
}
