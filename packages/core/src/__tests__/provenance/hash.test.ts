import { describe, it, expect } from 'vitest';
import { hashString, hashConfig } from '../../provenance/hash.js';
import path from 'path';

describe('Provenance Hashing', () => {
  it('should generate consistent SHA-256 hashes for strings', () => {
    const data = 'hello world';
    const hash1 = hashString(data);
    const hash2 = hashString(data);
    expect(hash1).toBe(hash2);
    // Known SHA-256 for 'hello world'
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should generate consistent hashes for configs with redacted secrets', () => {
    const config1 = {
      compile: {
        targets: ['mcp-profile-server'],
        some_api_key: 'real-secret-123'
      }
    };
    
    const config2 = {
      compile: {
        some_api_key: 'different-secret-456',
        targets: ['mcp-profile-server'] // different key order
      }
    };

    const hash1 = hashConfig(config1);
    const hash2 = hashConfig(config2);

    // Because keys are sorted and secrets are redacted to '[REDACTED]', they should hash identically.
    expect(hash1).toBe(hash2);
  });
});
