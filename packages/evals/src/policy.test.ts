import { describe, it, expect } from 'vitest';
import { ContextPacker } from '@ocf/core';
import type { OKFDocument } from '@ocf/core';
import {
  localDeveloperPolicy,
  regulatedEnterprisePolicy,
  PolicyEngine,
} from '@ocf/core';
import type { CapabilityManifest } from '@ocf/core';

const mockCapabilities: CapabilityManifest[] = [
  {
    id: 'ocf.auto.prepare',
    name: 'prepare_application',
    kind: 'tool',
    version: '1.0.0',
    description: 'Prepares an application.',
    riskLevel: 'medium',
    sideEffectLevel: 'external-read',
    requiredApproval: false,
  },
  {
    id: 'ocf.auto.confirm',
    name: 'confirm_application_submission',
    kind: 'tool',
    version: '1.0.0',
    description: 'Submits an application.',
    riskLevel: 'critical',
    sideEffectLevel: 'external-submit',
    requiredApproval: true,
  }
];

describe('Governance Plane Tests', () => {

  describe('PII Redaction in ContextPacker', () => {
    const mockDocs: OKFDocument[] = [
      {
        conceptId: 'personal-1',
        filePath: '/personal/contact.md',
        frontmatter: {
          type: 'Preference',
          email: 'johndoe@example.com',
          phone: '+1-555-123-4567',
        },
        body: 'Contact me at johndoe@example.com or call +1-555-123-4567.',
      },
    ];

    it('redacts email and phone when policy is redact', () => {
      const packer = new ContextPacker(regulatedEnterprisePolicy);
      const result = packer.pack(mockDocs, {
        task: 'Find contact info',
        profile: 'career',
        mode: 'full',
        maxTokens: 1000,
        includeProvenance: true,
      });

      const excerpt = result.documents[0]?.excerpt || '';
      expect(excerpt).not.toContain('johndoe@example.com');
      expect(excerpt).not.toContain('+1-555-123-4567');
      expect(excerpt).toContain('[REDACTED_EMAIL]');
      expect(excerpt).toContain('[REDACTED_PHONE]');
    });

    it('denies document entirely when policy is deny', () => {
      const strictPolicy = { ...regulatedEnterprisePolicy, piiHandling: 'deny' as const };
      const packer = new ContextPacker(strictPolicy);
      const result = packer.pack(mockDocs, {
        task: 'Find contact info',
        profile: 'career',
        mode: 'full',
        maxTokens: 1000,
        includeProvenance: true,
      });

      expect(result.documents.length).toBe(0);
      expect(result.omitted.length).toBe(1);
      expect(result.omitted[0]?.reason).toContain('PII Handling Policy: Deny');
    });

    it('leaves data untouched when policy is allow-with-audit', () => {
      const packer = new ContextPacker(localDeveloperPolicy);
      const result = packer.pack(mockDocs, {
        task: 'Find contact info',
        profile: 'career',
        mode: 'full',
        maxTokens: 1000,
        includeProvenance: true,
      });

      const excerpt = result.documents[0]?.excerpt || '';
      expect(excerpt).toContain('johndoe@example.com');
      expect(excerpt).toContain('+1-555-123-4567');
    });
  });

  describe('Autonomy Level Enforcement', () => {
    it('observe mode blocks all writes and submits', () => {
      const observePolicy = { ...localDeveloperPolicy, autonomyLevel: 'observe' as const };
      const engine = new PolicyEngine(observePolicy);
      
      // confirm_application_submission is external-submit
      expect(() => engine.validateExecution('confirm_application_submission', mockCapabilities, {})).toThrow(/cannot execute write side-effect/);
    });

    it('advise mode allows reads but blocks submits', () => {
      const advisePolicy = { ...localDeveloperPolicy, autonomyLevel: 'advise' as const };
      const engine = new PolicyEngine(advisePolicy);
      
      // prepare_application is external-read, should not throw
      expect(() => engine.validateExecution('prepare_application', mockCapabilities, {})).not.toThrow();

      // confirm_application_submission is external-submit, should throw
      expect(() => engine.validateExecution('confirm_application_submission', mockCapabilities, {})).toThrow(/cannot execute 'external-submit'/);
    });

    it('act-with-approval blocks execution if tool is not whitelisted for approval', () => {
      // In enterpriseSandboxPolicy, confirm_application_submission requires approval but isn't explicitly blocked
      // We will create a strict policy that doesn't whitelist it
      const strictApprovalPolicy = {
        ...regulatedEnterprisePolicy,
        approvalRequiredFor: ['some_other_tool'], // Missing confirm_application_submission
      };
      const engine = new PolicyEngine(strictApprovalPolicy);

      expect(() => engine.validateExecution('confirm_application_submission', mockCapabilities, {})).toThrow(/does not whitelist it for approval-based execution/);
    });

    it('explicit deny blocklist overrides autonomy levels', () => {
      const customPolicy = { ...localDeveloperPolicy, deniedTools: ['prepare_application'] };
      const engine = new PolicyEngine(customPolicy);
      
      expect(() => engine.validateExecution('prepare_application', mockCapabilities, {})).toThrow(/explicitly denied/);
    });
  });
});
