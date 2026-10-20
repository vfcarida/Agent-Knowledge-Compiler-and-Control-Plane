import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPolicyVerifyCommand(
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
    .command("verify")
    .description(
      "Formally verify policy safety invariants or prove semantic equivalence across the finite request state space",
    )
    .argument(
      "[target]",
      "Path to a .policy.yaml file or directory containing policy files",
      ".",
    )
    .option(
      "--compare <otherTarget>",
      "Optional second policy file/directory to prove semantic equivalence against",
    )
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .action(
      async (target: string, options: { compare?: string; format: string }) => {
        const path = await import("path");
        const fs = await import("fs");
        const { loadPolicy, verifyPolicyInvariants, provePolicyEquivalence } =
          await import("@akcp/core");

        const loadTargetCards = (inputPath: string) => {
          const fullPath = path.resolve(process.cwd(), inputPath);
          if (!fs.existsSync(fullPath)) {
            throw new Error(`Policy target not found: ${fullPath}`);
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
            throw new Error(`No .policy.yaml files found in ${fullPath}`);
          }

          const cardsMap: Record<string, ReturnType<typeof loadPolicy>> = {};
          for (const file of policyFiles) {
            cardsMap[file] = loadPolicy(file);
          }
          return cardsMap;
        };

        try {
          const cardsA = loadTargetCards(target);
          const invariantReport = verifyPolicyInvariants(cardsA);

          let equivalenceReport:
            ReturnType<typeof provePolicyEquivalence> | undefined;
          if (options.compare) {
            const cardsB = loadTargetCards(options.compare);
            equivalenceReport = provePolicyEquivalence(cardsA, cardsB);
          }

          if (options.format === "json") {
            console.log(
              JSON.stringify(
                {
                  invariantReport,
                  ...(equivalenceReport ? { equivalenceReport } : {}),
                },
                null,
                2,
              ),
            );
          } else {
            console.log("=== AKCP Formal Policy Verification ===");
            console.log(`Target:             ${target}`);
            console.log(
              `States Explored:    ${invariantReport.statesExplored}`,
            );
            console.log(
              `Invariants Checked: ${invariantReport.invariantsChecked}`,
            );
            console.log(
              `Verification Status:${invariantReport.verified ? " VERIFIED (0 Counterexamples)" : ` FAILED (${invariantReport.counterexamples.length} Counterexample(s))`}`,
            );
            console.log("\nInvariant Summary:");
            for (const inv of invariantReport.invariantResults) {
              const badge = inv.passed ? "[PASS]" : "[FAIL]";
              console.log(
                `  ${badge} ${inv.id} (${inv.violations} violation(s))`,
              );
              console.log(`         ${inv.description}`);
            }

            if (invariantReport.counterexamples.length > 0) {
              console.log("\nSample Counterexamples (up to 5):");
              for (const ce of invariantReport.counterexamples.slice(0, 5)) {
                console.log(
                  `  - [${ce.invariantId}] Rule '${ce.violatingRuleId}' produced '${ce.decision.effect}' for { tool: ${ce.state.tool}, riskLevel: ${ce.state.riskLevel}, sideEffect: ${ce.state.sideEffect}, env: ${ce.state.environment} }`,
                );
              }
            }

            if (equivalenceReport) {
              console.log("\n=== Semantic Policy Equivalence Proof ===");
              console.log(`Compared Against:   ${options.compare}`);
              console.log(
                `States Explored:    ${equivalenceReport.statesExplored}`,
              );
              console.log(
                `Equivalence Status: ${equivalenceReport.equivalent ? "PROVEN EQUIVALENT" : `DIVERGENT (${equivalenceReport.divergingStates.length} diverging state(s))`}`,
              );
            }
          }

          if (
            !invariantReport.verified ||
            (equivalenceReport && !equivalenceReport.equivalent)
          ) {
            process.exit(1);
          }
        } catch (err: any) {
          console.error(
            `[ERROR] Formal policy verification failed:\n${err.message}`,
          );
          process.exit(1);
        }
      },
    );
}
