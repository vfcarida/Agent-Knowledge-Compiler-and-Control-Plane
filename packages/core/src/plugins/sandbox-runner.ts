import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { PluginManifest, PluginPermission } from "./manifest-schema.js";
import { PluginSecurityError } from "./loader.js";

export interface SandboxExecutionOptions {
  allowedRootDir: string;
  timeoutMs?: number;
  expectedCodeSha256?: string;
  inputPayload?: unknown;
  outboundFetchHandler?: (url: string) => Promise<unknown> | unknown;
  mcpExecuteHandler?: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
}

export interface SandboxExecutionResult<T = unknown> {
  pluginName: string;
  codeSha256: string;
  output: T;
  logs: string[];
  permissionsUsed: PluginPermission[];
}

export function computePluginCodeHash(code: string): string {
  return crypto.createHash("sha256").update(code, "utf8").digest("hex");
}

function resolveConfinedPath(rootDir: string, relativeTarget: string): string {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, relativeTarget);
  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(resolvedRoot + path.sep)
  ) {
    throw new PluginSecurityError(
      `Sandbox path traversal blocked: '${relativeTarget}' escapes allowed root '${resolvedRoot}'.`,
    );
  }
  return resolvedTarget;
}

/**
 * Executes plugin code inside an isolated Node.js VM context with Object-Capability (OCap)
 * attenuated host bindings, path-traversal confinement, and CPU timeout enforcement.
 */
export class VmPluginSandbox {
  private readonly manifest: PluginManifest;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }

  private assertPermission(
    perm: PluginPermission,
    usedSet: Set<PluginPermission>,
  ): void {
    if (!this.manifest.permissions.includes(perm)) {
      throw new PluginSecurityError(
        `Plugin '${this.manifest.name}' attempted operation requiring undeclared permission '${perm}'.`,
      );
    }
    usedSet.add(perm);
  }

  public executeCode<T = unknown>(
    code: string,
    options: SandboxExecutionOptions,
  ): SandboxExecutionResult<T> {
    const codeSha256 = computePluginCodeHash(code);
    if (
      options.expectedCodeSha256 &&
      options.expectedCodeSha256 !== codeSha256
    ) {
      throw new PluginSecurityError(
        `Plugin '${this.manifest.name}' code hash mismatch: expected ${options.expectedCodeSha256}, got ${codeSha256}.`,
      );
    }

    const logs: string[] = [];
    const usedPermissions = new Set<PluginPermission>();
    const timeoutMs = options.timeoutMs ?? 1000;

    const akcpHost = Object.freeze({
      readFile: (relPath: string): string => {
        this.assertPermission("fs:read", usedPermissions);
        const safePath = resolveConfinedPath(options.allowedRootDir, relPath);
        return fs.readFileSync(safePath, "utf-8");
      },
      writeFile: (relPath: string, content: string): void => {
        this.assertPermission("fs:write", usedPermissions);
        const safePath = resolveConfinedPath(options.allowedRootDir, relPath);
        fs.mkdirSync(path.dirname(safePath), { recursive: true });
        fs.writeFileSync(safePath, content, "utf-8");
      },
      fetchUrl: (url: string): unknown => {
        this.assertPermission("network:outbound", usedPermissions);
        if (!options.outboundFetchHandler) {
          throw new PluginSecurityError(
            "No outboundFetchHandler configured in sandbox host.",
          );
        }
        return options.outboundFetchHandler(url);
      },
      executeMcp: (
        toolName: string,
        args: Record<string, unknown> = {},
      ): unknown => {
        this.assertPermission("mcp:execute", usedPermissions);
        if (!options.mcpExecuteHandler) {
          throw new PluginSecurityError(
            "No mcpExecuteHandler configured in sandbox host.",
          );
        }
        return options.mcpExecuteHandler(toolName, args);
      },
    });

    const sandboxConsole = Object.freeze({
      log: (...args: unknown[]) =>
        logs.push(args.map((a) => String(a)).join(" ")),
      warn: (...args: unknown[]) =>
        logs.push("[WARN] " + args.map((a) => String(a)).join(" ")),
      error: (...args: unknown[]) =>
        logs.push("[ERROR] " + args.map((a) => String(a)).join(" ")),
    });

    const sandboxGlobals: Record<string, unknown> = {
      console: sandboxConsole,
      akcpHost,
      input: options.inputPayload,
      module: { exports: {} },
      exports: {},
      process: undefined,
      require: undefined,
      fetch: undefined,
    };

    const context = vm.createContext(sandboxGlobals, {
      codeGeneration: { strings: false, wasm: false },
    });

    const script = new vm.Script(code, {
      filename: `${this.manifest.name}-sandbox.js`,
    });

    const returnedValue = script.runInContext(context, {
      timeout: timeoutMs,
    });

    const moduleObj = sandboxGlobals.module as { exports: unknown };
    const finalOutput = (
      returnedValue !== undefined ? returnedValue : moduleObj.exports
    ) as T;

    return {
      pluginName: this.manifest.name,
      codeSha256,
      output: finalOutput,
      logs,
      permissionsUsed: [...usedPermissions],
    };
  }
}
