import fs from 'node:fs/promises';
import path from 'node:path';
import type { AgentKnowledgeIR } from '../ir/types.js';
import type { BuildManifest, ArtifactProvenance } from './types.js';
import type { TargetOutput } from '../targets/types.js';

export class ProvenanceManifestBuilder {
  private outputs: ArtifactProvenance[] = [];
  private warnings: string[] = [];

  addOutput(output: TargetOutput) {
    this.outputs.push({
      targetType: output.targetType,
      outputPath: output.outputPath,
      hash: output.hash,
      bytesWritten: output.bytesWritten
    });
  }

  addWarning(warning: string) {
    this.warnings.push(warning);
  }

  async writeManifest(ir: AgentKnowledgeIR, manifestPath: string, configHash: string, toolVersion: string): Promise<void> {
    const fullPath = path.resolve(process.cwd(), manifestPath);
    const outDir = path.dirname(fullPath);
    
    await fs.mkdir(outDir, { recursive: true });
    
    const manifest: BuildManifest = {
      version: '1.0.0',
      buildId: ir.buildId,
      bundleId: ir.bundleId,
      timestamp: ir.timestamp,
      toolVersion,
      configHash,
      sourceHashes: ir.sourceHashes || {},
      targets: this.outputs,
      warnings: this.warnings
    };
    
    await fs.writeFile(fullPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}
