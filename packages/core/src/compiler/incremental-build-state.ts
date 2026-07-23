import fs from "node:fs";
import path from "node:path";

export type IncrementalBuildState = {
  sourceHash: string;
  normalizedHash: string;
  artifactHash: string;
  lastCompiledAt: string;
  dependencies: string[];
};

export type BuildStateCache = Record<string, IncrementalBuildState>;

export class IncrementalCompiler {
  private stateFile: string;
  private state: BuildStateCache = {};

  constructor(workspaceDir: string) {
    let resolvedDir = workspaceDir;
    try {
      if (fs.existsSync(workspaceDir) && fs.statSync(workspaceDir).isFile()) {
        resolvedDir = path.dirname(workspaceDir);
      }
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    } catch (e) {
      // Ignore
    }

    this.stateFile = path.join(
      resolvedDir,
      ".akcp",
      "cache",
      "build-state.json",
    );
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, "utf-8");
        this.state = JSON.parse(raw);
      }
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    } catch (e) {
      this.state = {};
    }
  }

  public saveState() {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.stateFile,
        JSON.stringify(this.state, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.warn("[WARN] Failed to save incremental build state.", e);
    }
  }

  public shouldCompile(fileUri: string, currentHash: string): boolean {
    const cached = this.state[fileUri];
    if (!cached) return true;
    return cached.sourceHash !== currentHash;
  }

  public updateState(
    fileUri: string,
    currentHash: string,
    artifactHash: string,
    dependencies: string[] = [],
  ) {
    this.state[fileUri] = {
      sourceHash: currentHash,
      normalizedHash: "", // reserved for mid-step hashing
      artifactHash,
      lastCompiledAt: new Date().toISOString(),
      dependencies,
    };
  }

  public getState(fileUri: string): IncrementalBuildState | undefined {
    return this.state[fileUri];
  }
}
