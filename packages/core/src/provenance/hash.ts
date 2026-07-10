import crypto from 'node:crypto';
import fs from 'node:fs/promises';

/**
 * Generates a SHA-256 hash for a given string.
 */
export function hashString(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a SHA-256 hash for a file.
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generates a stable SHA-256 hash for a config object, redacting specific keys (e.g. secrets)
 */
export function hashConfig(config: any): string {
  const redactedConfig = redactSecrets(config);
  // Stable stringify: sort keys so ordering doesn't break hash
  const stableString = stableStringify(redactedConfig);
  return hashString(stableString);
}

function redactSecrets(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('secret') || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('password')) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSecrets(obj[key]);
    }
  }
  return result;
}

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}
