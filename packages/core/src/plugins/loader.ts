import { PluginManifestSchema } from "./manifest-schema.js";
import type { PluginManifest, PluginPermission } from "./manifest-schema.js";
import * as fs from "fs";
import * as path from "path";

export class PluginSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginSecurityError";
  }
}

export class PluginValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginValidationError";
  }
}

export class PluginLoader {
  static loadManifest(pluginDir: string): PluginManifest {
    const manifestPath = path.join(pluginDir, "akcp-plugin.json");
    if (!fs.existsSync(manifestPath)) {
      throw new PluginValidationError(`Manifest not found at ${manifestPath}`);
    }

    try {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      const data = JSON.parse(raw);
      return PluginManifestSchema.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.name === "ZodError") {
        throw new PluginValidationError(
          `Invalid manifest schema: ${err.message}`,
        );
      }
      throw new PluginValidationError(
        `Failed to parse manifest: ${err.message}`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async loadPlugin<T = any>(
    pluginDir: string,
    requiredPermissions: PluginPermission[] = [],
  ): Promise<{ manifest: PluginManifest; exports: T }> {
    const manifest = this.loadManifest(pluginDir);

    // Security Check: Verify declared permissions against required permissions
    for (const required of requiredPermissions) {
      if (!manifest.permissions.includes(required)) {
        throw new PluginSecurityError(
          `Plugin '${manifest.name}' requires undeclared permission: ${required}`,
        );
      }
    }

    // Attempt to load entrypoint
    const entrypointPath = path.join(pluginDir, manifest.entrypoint);
    if (!fs.existsSync(entrypointPath)) {
      throw new PluginValidationError(
        `Entrypoint not found at ${entrypointPath}`,
      );
    }

    try {
      // In a real isolated environment, this would be a secure sandbox or VM.
      // For build-time plugins we dynamically import, trusting the local workspace (with explicit permission checks as a guardrail).
      // Lazy: Plugin loader dynamically imports user-provided paths
      const pluginExports = await import(pathToFileURL(entrypointPath).href);
      return { manifest, exports: pluginExports };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      throw new PluginValidationError(
        `Failed to load plugin entrypoint: ${err.message}`,
      );
    }
  }
}

import { pathToFileURL } from "url";
