import fs from 'node:fs';
import path from 'node:path';
import type { AkcpConfig } from '../config/akcp-config-schema.js';

export interface ReconcileOptions {
  dryRun: boolean;
}

export interface ReconcileResult {
  status: 'in-sync' | 'out-of-sync' | 'error';
  differences: string[];
  message: string;
}

/**
 * Compares the desired state (akcp.yaml config) with the current state (filesystem).
 * For now, only supports dry-run (observability). Destructive changes will be implemented later.
 */
export async function reconcile(config: AkcpConfig, options: ReconcileOptions): Promise<ReconcileResult> {
  const differences: string[] = [];

  // 1. Check sources existence
  for (const source of config.compile.sources) {
    if (source.path) {
      const sourcePath = path.resolve(source.path);
      if (!fs.existsSync(sourcePath)) {
        differences.push(`Source missing: Directory '${source.path}' does not exist.`);
      }
    }
  }

  // 2. Check target output
  if (config.compile.targets) {
    for (const targetConf of config.compile.targets) {
      const targetPath = path.resolve(targetConf.out);
      if (!fs.existsSync(targetPath)) {
        differences.push(`Target missing: Compiled output '${targetConf.out}' does not exist.`);
      }
    }
  } else {
    // In a real compiler, we would compare the target's build timestamp with source modified times.
    // We'll leave that to the actual build command, but note it in dry run if possible.
  }

  // 3. Dry run semantics
  if (options.dryRun) {
    if (differences.length === 0) {
      return {
        status: 'in-sync',
        differences,
        message: 'Dry run: System is in-sync with desired state.'
      };
    } else {
      return {
        status: 'out-of-sync',
        differences,
        message: 'Dry run: System is out-of-sync. Re-compilation or environment fixes required.'
      };
    }
  }

  // Actual mutation logic would go here if not dry-run.
  throw new Error("reconcile without dry-run is not yet implemented.");
}
