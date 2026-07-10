import { describe, it, expect, vi } from 'vitest';
import { MCPGateway, MCPGatewayError } from '../../capabilities/gateway.js';
import type { PolicyCard } from '../../policy/types.js';

describe('MCPGateway', () => {
  const rawPolicy = {
    apiVersion: 'policy.ocf.dev/v1alpha1',
    kind: 'PolicyCard',
    metadata: { name: 'test-policy' },
    spec: {
      allowedTools: ['read_document', 'create_document'],
      forbiddenTools: ['delete_document'],
      sideEffectRules: {
        read: 'allow',
        write: 'allow',
        submit: 'deny'
      },
      approvalRequirements: [],
      piiHandling: 'redact'
    }
  };

  const mockPolicy: PolicyCard = rawPolicy as unknown as PolicyCard;

  const gateway = new MCPGateway({
    policies: {
      'agent-1': mockPolicy
    },
    defaultPolicy: undefined
  });

  it('should block execution if no valid policy is found for agent', async () => {
    await expect(gateway.execute({
      requestId: '123',
      toolName: 'read_document',
      sideEffect: 'read',
      agentId: 'unknown-agent',
      payload: {}
    }, async () => ({ success: true })))
      .rejects
      .toThrowError(MCPGatewayError);
  });

  it('should allow execution for allowed tool', async () => {
    const result = await gateway.execute({
      requestId: '123',
      toolName: 'read_document',
      sideEffect: 'read',
      agentId: 'agent-1',
      payload: {}
    }, async () => ({ success: true }));

    expect(result.success).toBe(true);
  });

  it('should block execution for forbidden tool', async () => {
    await expect(gateway.execute({
      requestId: '123',
      toolName: 'delete_document',
      sideEffect: 'write',
      agentId: 'agent-1',
      payload: {}
    }, async () => ({ success: true })))
      .rejects
      .toThrowError(/Policy Violation/);
  });

  it('should block execution for denied sideEffect', async () => {
    await expect(gateway.execute({
      requestId: '123',
      toolName: 'create_document', // allowed tool
      sideEffect: 'submit',        // but submit sideEffect is denied
      agentId: 'agent-1',
      payload: {}
    }, async () => ({ success: true })))
      .rejects
      .toThrowError(/Policy Violation/);
  });

  it('should sanitize PII output when piiHandling is redact', async () => {
    const result = await gateway.execute({
      requestId: '123',
      toolName: 'read_document',
      sideEffect: 'read',
      agentId: 'agent-1',
      payload: {}
    }, async () => ({ 
      email: 'john.doe@example.com',
      ssn: '123-45-6789',
      name: 'John Doe'
    }));

    expect(result.email).toBe('[REDACTED_EMAIL]');
    expect(result.ssn).toBe('[REDACTED_SSN]');
    expect(result.name).toBe('John Doe'); // Unaffected
  });

  it('should throw error when piiHandling is deny and PII is found', async () => {
    const strictGateway = new MCPGateway({
      policies: {
        'agent-2': {
          ...mockPolicy,
          spec: {
            ...mockPolicy.spec,
            piiHandling: 'deny'
          }
        }
      }
    });

    await expect(strictGateway.execute({
      requestId: '123',
      toolName: 'read_document',
      sideEffect: 'read',
      agentId: 'agent-2',
      payload: {}
    }, async () => ({ 
      email: 'john.doe@example.com'
    })))
      .rejects
      .toThrowError(/PII detected in output/);
  });
});
