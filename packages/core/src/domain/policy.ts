export type AgentPolicy = {
  policyId: string;
  autonomyLevel: 'observe' | 'advise' | 'act-with-approval' | 'act-autonomously';
  allowedReadScopes: string[];
  allowedWriteScopes: string[];
  allowedTools: string[];
  deniedTools: string[];
  approvalRequiredFor: string[];
  piiHandling: 'deny' | 'redact' | 'allow-with-audit';
  loggingLevel: 'minimal' | 'standard' | 'audit';
};

export const localDeveloperPolicy: AgentPolicy = {
  policyId: 'local-dev-01',
  autonomyLevel: 'act-autonomously',
  allowedReadScopes: ['*'],
  allowedWriteScopes: ['*'],
  allowedTools: ['*'],
  deniedTools: [],
  approvalRequiredFor: [],
  piiHandling: 'allow-with-audit',
  loggingLevel: 'minimal',
};

export const enterpriseSandboxPolicy: AgentPolicy = {
  policyId: 'ent-sandbox-01',
  autonomyLevel: 'advise',
  allowedReadScopes: ['profile', 'software-project'],
  allowedWriteScopes: ['scratch'],
  allowedTools: ['read_*', 'list_*', 'build_context_pack'],
  deniedTools: ['delete_document', 'migrate_bundle'],
  approvalRequiredFor: ['*'],
  piiHandling: 'redact',
  loggingLevel: 'standard',
};

export const regulatedEnterprisePolicy: AgentPolicy = {
  policyId: 'reg-ent-01',
  autonomyLevel: 'act-with-approval',
  allowedReadScopes: ['profile', 'compliance'],
  allowedWriteScopes: ['profile'],
  allowedTools: ['*'],
  deniedTools: ['delete_document'],
  approvalRequiredFor: ['create_document', 'update_document', 'confirm_application_submission'],
  piiHandling: 'redact',
  loggingLevel: 'audit',
};

import type { CapabilityManifest } from './capabilities.js';

export function enforcePolicy(toolName: string, capabilities: CapabilityManifest[], policy?: AgentPolicy): void {
  if (!policy) return; // Unrestricted if no policy

  // Check explicit block lists
  if (policy.deniedTools.includes(toolName) || policy.deniedTools.includes('*')) {
    throw new Error(`Policy Violation: Tool '${toolName}' is explicitly denied by policy '${policy.policyId}'.`);
  }

  // Check capabilities
  const capability = capabilities.find(c => c.name === toolName);
  if (!capability) return;

  const { autonomyLevel } = policy;
  const isWrite = capability.sideEffectLevel.includes('write') || capability.sideEffectLevel.includes('submit');

  if (autonomyLevel === 'observe') {
    if (isWrite) {
      throw new Error(`Policy Violation: Autonomy level 'observe' cannot execute write side-effect '${toolName}'.`);
    }
  } else if (autonomyLevel === 'advise') {
    if (capability.sideEffectLevel === 'external-submit' || capability.sideEffectLevel === 'local-write' || capability.sideEffectLevel === 'external-write') {
      throw new Error(`Policy Violation: Autonomy level 'advise' cannot execute '${capability.sideEffectLevel}' tool '${toolName}'.`);
    }
  } else if (autonomyLevel === 'act-with-approval') {
    // Requires an approval token (this is typically enforced inside the tool logic via ApprovalStore)
    // But we can assert that if the tool requires approval, it MUST be in the approvalRequiredFor list or '*'.
    if (capability.requiredApproval) {
      const allowedToApprove = policy.approvalRequiredFor.includes(toolName) || policy.approvalRequiredFor.includes('*');
      if (!allowedToApprove) {
        throw new Error(`Policy Violation: Tool '${toolName}' requires approval, but policy '${policy.policyId}' does not whitelist it for approval-based execution.`);
      }
    }
  }
}
