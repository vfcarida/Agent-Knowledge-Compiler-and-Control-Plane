import * as fs from 'fs';
import * as path from 'path';
import { PluginLoader } from './loader.js';
import type { PluginManifest } from './manifest-schema.js';

export interface DiscoveredPlugin {
  dirPath: string;
  manifest: PluginManifest;
  error?: string;
}

export class PluginRegistry {
  /**
   * Discovers plugins in a given directory (e.g., ./plugins).
   * Scans subdirectories for `akcp-plugin.json` and validates them.
   */
  static discoverLocalPlugins(pluginsDir: string): DiscoveredPlugin[] {
    const discovered: DiscoveredPlugin[] = [];

    if (!fs.existsSync(pluginsDir)) {
      return discovered;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginDir = path.join(pluginsDir, entry.name);
        try {
          const manifest = PluginLoader.loadManifest(pluginDir);
          discovered.push({
            dirPath: pluginDir,
            manifest
          });
        } catch (err: any) {
          // Record broken plugins so the CLI can report them instead of silently ignoring
          discovered.push({
            dirPath: pluginDir,
            manifest: null as any,
            error: err.message
          });
        }
      }
    }

    return discovered;
  }
}
