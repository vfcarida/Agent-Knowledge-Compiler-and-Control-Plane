import type { PolicyCard } from './types.js';

export function explainPolicy(policy: PolicyCard): string {
  const spec = policy.spec;
  const lines: string[] = [];
  
  lines.push(`Policy Name: ${policy.metadata.name}`);
  if (policy.metadata.description) {
    lines.push(`Description: ${policy.metadata.description}`);
  }
  lines.push(`Version: ${policy.metadata.version || 'v1'}`);
  lines.push('');
  
  lines.push('--- Access Rules ---');
  lines.push(`Allowed Agents: ${spec.allowedAgents.join(', ')}`);
  lines.push(`Allowed Tools: ${spec.allowedTools.join(', ')}`);
  if (spec.forbiddenTools.length > 0) {
    lines.push(`Forbidden Tools: ${spec.forbiddenTools.join(', ')}`);
  }
  lines.push('');
  
  lines.push('--- Side Effects ---');
  const se = spec.sideEffectRules || { read: 'allow', write: 'approval', submit: 'approval' };
  lines.push(`Read Actions: ${se.read}`);
  lines.push(`Write Actions: ${se.write}`);
  lines.push(`Submit Actions: ${se.submit}`);
  lines.push('');
  
  lines.push('--- Requirements ---');
  lines.push(`PII Handling: ${spec.piiHandling}`);
  if (spec.approvalRequirements.length > 0) {
    lines.push(`Explicit Approval For: ${spec.approvalRequirements.join(', ')}`);
  }
  if (spec.evidenceRequirements && spec.evidenceRequirements.length > 0) {
    lines.push(`Evidence Required: ${spec.evidenceRequirements.join(', ')}`);
  }
  lines.push('');

  if (spec.mappings) {
    lines.push('--- Framework Mappings ---');
    if (spec.mappings.nist_ai_rmf) {
      lines.push(`NIST AI RMF: ${spec.mappings.nist_ai_rmf.join(', ')}`);
    }
    if (spec.mappings.owasp_llm) {
      lines.push(`OWASP LLM Top 10: ${spec.mappings.owasp_llm.join(', ')}`);
    }
  }

  return lines.join('\n');
}
