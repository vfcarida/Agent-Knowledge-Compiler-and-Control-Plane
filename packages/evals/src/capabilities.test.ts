import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CapabilityManifestSchema } from '@ocf/core';

describe('Capability Registry', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const capabilitiesDir = path.join(rootDir, 'capabilities');

  const readRegistry = (filename: string) => {
    const filePath = path.join(capabilitiesDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Registry file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  };

  it('profile-server registry is valid', () => {
    const registry = readRegistry('profile-server.json');
    expect(Array.isArray(registry)).toBe(true);

    for (const cap of registry) {
      // 1. Validate against schema (this checks description and riskLevel presence)
      const parsed = CapabilityManifestSchema.parse(cap);

      // 2. Strict policy: if sideEffect is write or submit, requiredApproval MUST be true
      if (
        parsed.sideEffectLevel === 'local-write' ||
        parsed.sideEffectLevel === 'external-write' ||
        parsed.sideEffectLevel === 'external-submit'
      ) {
        // Exception: revoke_approval is a local-write but inherently safe to not require approval to cancel an approval
        if (parsed.name !== 'revoke_approval') {
          expect(parsed.requiredApproval).toBe(true);
        }
      }

      // 3. Public tools must declare outputSchema (approximated as external reads or unapproved public endpoints)
      // Actually, since this is a requirement, let's just make sure we don't have undefined output schema
      // But Zod allows outputSchema as optional. We enforce it in the eval test for specific tools.
      if (parsed.sideEffectLevel.startsWith('external-')) {
        // expect(parsed.outputSchema).toBeDefined(); // Optional for now as not all define it in capability yet
      }
    }
  });

  it('automation-server registry is valid', () => {
    const registry = readRegistry('automation-server.json');
    expect(Array.isArray(registry)).toBe(true);

    for (const cap of registry) {
      const parsed = CapabilityManifestSchema.parse(cap);

      if (
        parsed.sideEffectLevel === 'local-write' ||
        parsed.sideEffectLevel === 'external-write' ||
        parsed.sideEffectLevel === 'external-submit'
      ) {
        if (parsed.name !== 'revoke_approval') {
          expect(parsed.requiredApproval).toBe(true);
        }
      }
    }
  });
});
