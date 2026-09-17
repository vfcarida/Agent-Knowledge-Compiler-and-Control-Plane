import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerInitCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("init")
    .description("Initialize a new .agent-context structure")
    .argument("[directory]", "Directory to initialize", ".")
    .option(
      "-t, --template <profile>",
      "Context profile template (e.g., career, it-ops, customer-support)",
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
    .option(
      "-i, --interactive",
      "Run interactive setup wizard to configure template, destination, and autonomy",
      false,
    )
    .action(async (directory, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      let requestedProfile = options.template || options.profile || "career";
      let outDir = options.output || directory;
      let autonomyLevel: string | undefined = undefined;

      if (options.interactive) {
        let templateInput = "";
        let dirInput = "";
        let autonomyInput = "";

        if (process.stdin.isTTY) {
          const readlinePromises = await import("readline/promises");
          const rl = readlinePromises.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          try {
            console.log("\n=== AKCP Knowledge Bundle Initializer ===\n");
            templateInput = await rl.question(
              "Choose domain template [it-operations (default), career, customer-support]: ",
            );
            const chosenTemplate =
              templateInput.trim().toLowerCase() === "career" ||
              templateInput.trim().toLowerCase() === "customer-support" ||
              templateInput.trim().toLowerCase() === "it-operations" ||
              templateInput.trim().toLowerCase() === "it-ops"
                ? templateInput.trim().toLowerCase()
                : "it-operations";
            const defaultDir = `./${
              chosenTemplate === "it-operations" || chosenTemplate === "it-ops"
                ? "my-it-operations"
                : chosenTemplate === "customer-support"
                  ? "my-customer-support"
                  : "my-career"
            }`;
            dirInput = await rl.question(
              `Target directory [default: ${defaultDir}]: `,
            );
            autonomyInput = await rl.question(
              "Autonomy level [sandbox, human-in-the-loop (default), autonomous]: ",
            );
          } finally {
            rl.close();
          }
        } else {
          // Piped stdin stream (e.g. CI or non-interactive script testing)
          const readline = await import("readline");
          const rl = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity,
          });
          const lines: string[] = [];
          for await (const line of rl) {
            lines.push(line.trim());
          }
          templateInput = lines[0] || "";
          dirInput = lines[1] || "";
          autonomyInput = lines[2] || "";
        }

        const tTrimmed = templateInput.trim().toLowerCase();
        if (
          tTrimmed === "career" ||
          tTrimmed === "customer-support" ||
          tTrimmed === "it-operations" ||
          tTrimmed === "it-ops"
        ) {
          requestedProfile = tTrimmed;
        } else {
          requestedProfile = "it-operations";
        }

        const defaultDir = `./${
          requestedProfile === "it-operations" || requestedProfile === "it-ops"
            ? "my-it-operations"
            : requestedProfile === "customer-support"
              ? "my-customer-support"
              : "my-career"
        }`;
        const dTrimmed = dirInput.trim();
        if (dTrimmed) {
          outDir = dTrimmed;
        } else {
          outDir = defaultDir;
        }

        const aTrimmed = autonomyInput.trim().toLowerCase();
        if (aTrimmed === "sandbox" || aTrimmed === "autonomous") {
          autonomyLevel = aTrimmed;
        } else {
          autonomyLevel = "human-in-the-loop";
        }

        console.log(
          `[INFO] Initializing bundle '${requestedProfile}' at '${outDir}' (Autonomy: ${autonomyLevel})...`,
        );
      }

      const targetDir = path.resolve(process.cwd(), outDir);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Attempt to copy from Domain Adapter templates if available
      try {
        const cliDir = path.dirname(fileURLToPath(import.meta.url));
        const TEMPLATE_ALIASES: Record<string, string> = {
          "it-ops": "it-operations",
        };
        const profile = TEMPLATE_ALIASES[requestedProfile] || requestedProfile;

        const candidates = [
          path.resolve(cliDir, "../../../templates", profile),
          path.resolve(cliDir, "../templates", profile),
          path.resolve(cliDir, "../../../../../examples/domains", profile),
          path.resolve(cliDir, "../../../../examples/domains", profile),
          path.resolve(cliDir, "../../../examples/domains", profile),
          path.resolve(process.cwd(), "examples/domains", profile),
        ];
        const templateDir = candidates.find((c) => fs.existsSync(c));

        if (templateDir && fs.existsSync(templateDir)) {
          fs.cpSync(templateDir, targetDir, { recursive: true });

          // Ensure .akcp/cache is not copied over if it existed in the source
          const cacheDir = path.join(targetDir, ".akcp", "cache");
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
          }

          // Apply customized autonomy level if chosen in interactive mode
          const akcpYamlPath = path.join(targetDir, "akcp.yaml");
          if (fs.existsSync(akcpYamlPath) && autonomyLevel) {
            let content = fs.readFileSync(akcpYamlPath, "utf-8");
            if (content.includes("defaultAutonomyLevel:")) {
              content = content.replace(
                /defaultAutonomyLevel:\s*[^\r\n]+/,
                `defaultAutonomyLevel: ${autonomyLevel}`,
              );
              fs.writeFileSync(akcpYamlPath, content, "utf-8");
            }
          }

          console.log(`[INFO] Copied template: ${profile}`);
        } else {
          console.warn(
            `[WARN] Domain template '${profile}' not found. Initializing empty profile.`,
          );
        }
      } catch (e) {
        console.warn(
          `[WARN] Could not copy template for '${requestedProfile}'. Initializing empty profile.`,
        );
      }

      const indexContent = `---
type: Index
title: Context Pack Index
profile: ${requestedProfile}
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
Always load the local context pack before answering questions related to the domain '${requestedProfile}'.
`;
      if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) {
        fs.writeFileSync(path.join(targetDir, "AGENTS.md"), agentsMdContent);
      }

      console.log(
        `[OK] Context Pack initialized at ${targetDir} using template '${requestedProfile}'`,
      );
    });
}
