import fs from 'node:fs';
import yaml from 'yaml';
import { z } from 'zod';
import { AkcpConfigSchema, type AkcpConfig } from './akcp-config-schema.js';

export class ConfigLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

export function loadAkcpConfig(filePath: string): AkcpConfig {
  if (!fs.existsSync(filePath)) {
    throw new ConfigLoadError(`Configuration file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  let parsedYaml: any;
  try {
    parsedYaml = yaml.parse(fileContent);
  } catch (error: any) {
    throw new ConfigLoadError(`Failed to parse YAML file at ${filePath}:\n${error.message}`);
  }

  try {
    return AkcpConfigSchema.parse(parsedYaml);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(err => `- ${err.path.join('.')}: ${err.message}`).join('\n');
      throw new ConfigLoadError(`Configuration validation failed in ${filePath}:\n${issues}`);
    }
    throw new ConfigLoadError(`Unknown validation error in ${filePath}`);
  }
}
