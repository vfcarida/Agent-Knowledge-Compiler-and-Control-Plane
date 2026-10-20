import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPolicyLintCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let policyCmd = program.commands.find((c) => c.name() === "policy");
  if (!policyCmd) {
    policyCmd = program
      .command("policy")
      .description("Manage and validate machine-readable Policy Cards");
  }

  policyCmd
    .command("lint")
    .description(
      "Analyze PolicyCard files for shadowed, contradictory, or redundant rules",
    )
    .argument(
      "[target]",
      "Path to a .policy.yaml file or directory containing policy files",
      ".",
    )
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .option("--strict", "Treat lint warnings as errors", false)
    .action(
      async (target: string, options: { format: string; strict?: boolean }) => {
        const path = await import("path");
        const fs = await import("fs");
        const { loadPolicy, lintPolicyCard, lintPolicies } =
          await import("@akcp/core");

        try {
          const fullPath = path.resolve(process.cwd(), target);
          if (!fs.existsSync(fullPath)) {
            console.error(`[ERROR] Policy target not found: ${fullPath}`);
            process.exit(1);
          }

          const stat = fs.statSync(fullPath);
          const policyFiles: string[] = [];

          if (stat.isFile()) {
            policyFiles.push(fullPath);
          } else if (stat.isDirectory()) {
            const walk = (dir: string) => {
              for (const entry of fs.readdirSync(dir, {
                withFileTypes: true,
              })) {
                if (
                  entry.name === "node_modules" ||
                  entry.name === "dist" ||
                  entry.name === ".git"
                ) {
                  continue;
                }
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  walk(entryPath);
                } else if (
                  entry.name.endsWith(".policy.yaml") ||
                  entry.name.endsWith(".policy.yml")
                ) {
                  policyFiles.push(entryPath);
                }
              }
            };
            walk(fullPath);
            policyFiles.sort();
          }

          if (policyFiles.length === 0) {
            console.error(`[ERROR] No .policy.yaml files found in ${fullPath}`);
            process.exit(1);
          }

          const cardsMap: Record<string, ReturnType<typeof loadPolicy>> = {};
          for (const file of policyFiles) {
            const card = loadPolicy(file);
            cardsMap[file] = card;
          }

          const firstFile = policyFiles[0]!;
          const result =
            policyFiles.length === 1
              ? lintPolicyCard(cardsMap[firstFile]!)
              : lintPolicies(cardsMap);

          const hasWarnings = result.issues.some(
            (i) => i.severity === "warning",
          );
          const isValid = result.valid && (!options.strict || !hasWarnings);

          if (options.format === "json") {
            console.log(
              JSON.stringify(
                {
                  valid: isValid,
                  filesAnalyzed: policyFiles.length,
                  issues: result.issues,
                },
                null,
                2,
              ),
            );
          } else {
            console.log(
              `Analyzed ${policyFiles.length} policy file(s) in ${target}`,
            );
            if (result.issues.length === 0) {
              console.log(
                `[OK] Policy lint passed with 0 shadowed, contradictory, or redundant rules.`,
              );
            } else {
              for (const issue of result.issues) {
                const prefix =
                  issue.severity === "error"
                    ? "[ERROR]"
                    : issue.severity === "warning"
                      ? "[WARN]"
                      : "[INFO]";
                console.log(`${prefix} [${issue.code}] ${issue.message}`);
              }
            }
          }

          if (!isValid) {
            process.exit(1);
          }
        } catch (err: any) {
          console.error(`[ERROR] Policy lint failed:\n${err.message}`);
          process.exit(1);
        }
      },
    );
}
