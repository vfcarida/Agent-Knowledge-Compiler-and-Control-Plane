import fs from 'node:fs/promises';
import path from 'node:path';
import type { TargetOutput } from './types.js';
import type { AgentKnowledgeIR } from '../ir/types.js';

export interface ManifestData {
  version: string;
  buildId: string;
  bundleId: string;
  timestamp: string;
  targets: TargetOutput[];
  sourceHashes?: Record<string, string>;
}

export class ManifestBuilder {
  private outputs: TargetOutput[] = [];

  addOutput(output: TargetOutput) {
    this.outputs.push(output);
  }

  async writeManifest(ir: AgentKnowledgeIR, manifestPath: string): Promise<void> {
    const fullPath = path.resolve(process.cwd(), manifestPath);
    const outDir = path.dirname(fullPath);
    
    await fs.mkdir(outDir, { recursive: true });
    
    const manifest: ManifestData = {
      version: '1.0.0',
      buildId: ir.buildId,
      bundleId: ir.bundleId,
      timestamp: ir.timestamp,
      targets: this.outputs,
      sourceHashes: ir.sourceHashes
    };
    
    await fs.writeFile(fullPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}
