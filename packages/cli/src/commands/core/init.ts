import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerInitCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("init")
    .description("Initialize a new .agent-context structure")
    .argument("[directory]", "Directory to initialize", ".")
    .option(
      "-t, --template <profile>",
      "Context profile template (e.g., career, it-ops)",
      "career",
    )
    .option(
      "-p, --profile <profile>",
      "Context profile (deprecated, use --template)",
    )
    .option(
      "-o, --output <dir>",
      "Output directory for the bundle (overrides positional directory)",
    )
    .action(async (directory, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      const outDir = options.output || directory;
      const targetDir = path.resolve(process.cwd(), outDir);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Attempt to copy from Domain Adapter templates if available
      try {
        const cliDir = path.dirname(fileURLToPath(import.meta.url));
        const profile = options.template || options.profile || "career";

        let templateDir = path.resolve(cliDir, "../../../templates", profile); // If from dist/commands/core, goes to dist/templates. If from src/commands/core, goes to src/templates.
        if (!fs.existsSync(templateDir)) {
          // If we are in packages/cli/dist/commands/core or packages/cli/src/commands/core
          // We need to go up 4 levels to get to packages/cli, then up 1 more to get to packages, then up 1 more to get to root. Wait.
          // cliDir = packages/cli/src/commands/core
          // cliDir/.. = commands
          // cliDir/../.. = src
          // cliDir/../../.. = cli
          // cliDir/../../../.. = packages
          // cliDir/../../../../.. = root
          templateDir = path.resolve(
            cliDir,
            "../../../../../examples/domains",
            profile,
          );
        }

        if (fs.existsSync(templateDir)) {
          fs.cpSync(templateDir, targetDir, { recursive: true });

          // Ensure .akcp/cache is not copied over if it existed in the source
          const cacheDir = path.join(targetDir, ".akcp", "cache");
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
          }

          console.log(`[INFO] Copied template: ${profile}`);
        } else {
          console.warn(
            `[WARN] Domain template '${profile}' not found. Initializing empty profile.`,
          );
        }
      } catch (e) {
        console.warn(
          `[WARN] Could not copy template for '${options.template || options.profile}'. Initializing empty profile.`,
        );
      }

      const indexContent = `---
type: Index
title: Context Pack Index
profile: ${options.template || options.profile || "career"}
version: 1.0.0
---

# Agent Context Pack
This directory contains akcp knowledge bundles.
`;
      // Only write index if it doesn't already exist from the template
      if (
        !fs.existsSync(path.join(targetDir, "index.md")) &&
        !fs.existsSync(path.join(targetDir, "akcp.yaml"))
      ) {
        fs.writeFileSync(path.join(targetDir, "index.md"), indexContent);
      }

      // Bootstrap AGENTS.md injection hint
      const agentsMdContent = `# Agent Instructions
Always load the local context pack before answering questions related to the domain '${options.template || options.profile || "career"}'.
`;
      if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) {
        fs.writeFileSync(path.join(targetDir, "AGENTS.md"), agentsMdContent);
      }

      console.log(
        `[OK] Context Pack initialized at ${targetDir} using template '${options.template || options.profile || "career"}'`,
      );
    });
}
