import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../../policy/evaluate.js';
import type { PolicyCard } from '../../policy/types.js';

describe('Policy Evaluation Engine', () => {
  const strictPolicy: PolicyCard = {
    apiVersion: 'policy.ocf.dev/v1alpha1',
    kind: 'PolicyCard',
    metadata: { name: 'Strict Policy' },
    spec: {
      allowedAgents: ['agent-1'],
      allowedContextPacks: ['pack-1'],
      allowedTools: ['read_document'],
      forbiddenTools: ['delete_document'],
      approvalRequirements: ['create_document'],
      sideEffectRules: {
        read: 'allow',
        write: 'approval',
        submit: 'deny'
      },
      piiHandling: 'deny'
    }
  };

  it('should deny execution of a forbidden tool', () => {
    const result = evaluatePolicy(strictPolicy, { toolName: 'delete_document', sideEffect: 'write' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('explicitly forbidden');
  });

  it('should deny execution if tool is not in allowed list', () => {
    const result = evaluatePolicy(strictPolicy, { toolName: 'unknown_tool', sideEffect: 'read' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in the allowed list');
  });

  it('should allow read tools without approval if in allowed list', () => {
    const result = evaluatePolicy(strictPolicy, { toolName: 'read_document', sideEffect: 'read' });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(false);
  });

  it('should deny if side effect rule is deny', () => {
    // E.g., forcing side effect to 'submit', which is denied in strict policy
    const result = evaluatePolicy(strictPolicy, { toolName: 'read_document', sideEffect: 'submit' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("is denied by policy");
  });

  const approvalPolicy: PolicyCard = {
    apiVersion: 'policy.ocf.dev/v1alpha1',
    kind: 'PolicyCard',
    metadata: { name: 'Approval Policy' },
    spec: {
      allowedAgents: ['*'],
      allowedContextPacks: ['*'],
      allowedTools: ['write_file'],
      forbiddenTools: [],
      approvalRequirements: ['write_file'],
      sideEffectRules: {
        read: 'allow',
        write: 'approval',
        submit: 'approval'
      },
      piiHandling: 'redact'
    }
  };

  it('should allow tool but flag as requiring approval', () => {
    const result = evaluatePolicy(approvalPolicy, { toolName: 'write_file', sideEffect: 'write' });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(true);
  });
});
