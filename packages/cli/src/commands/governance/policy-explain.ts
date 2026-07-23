import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPolicyExplainCommand(
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
    .command("explain")
    .description(
      "Explain a PolicyCard in human-readable text and optionally trace a request",
    )
    .argument("<file>", "Path to the .policy.yaml file")
    .option(
      "--request <json>",
      "Simulated request as JSON (tool, agentId, riskLevel, scopes)",
    )
    .option("--verbose", "Show all evaluated rules")
    .action(async (file, options) => {
      const path = await import("path");
      const {
        loadPolicy,
        explainPolicy,
        adaptPolicyCardToRules,
        evaluatePoliciesWithTrace,
      } = await import("@akcp/core");

      try {
        const fullPath = path.resolve(process.cwd(), file);
        const policy = loadPolicy(fullPath);

        if (!options.request) {
          console.log(explainPolicy(policy));
          return;
        }

        const rules = adaptPolicyCardToRules(policy);
        const request = JSON.parse(options.request);

        // Provide defaults for request if missing
        request.scopes = request.scopes || [];
        request.agentId = request.agentId || "anonymous";
        request.riskLevel = request.riskLevel || "low";

        const { decision, trace } = evaluatePoliciesWithTrace(rules, request);

        console.log(`Decision: ${decision.effect.toUpperCase()}`);
        console.log(`Reason:   ${decision.reason}`);

        if (trace.conflicts.length > 0) {
          console.log(`\nConflicts detected:`);
          for (const c of trace.conflicts) {
            console.log(`  - ${c.explanation}`);
          }
        }

        if (options.verbose) {
          console.log(`\nAll rules evaluated:`);
          for (const e of trace.evaluatedRules) {
            const status = e.matched && e.conditionsMet ? "MATCH" : "SKIP ";
            console.log(
              `  [${status}] ${e.rule.id} (${e.rule.effect}, priority ${e.rule.priority})${e.skipReason ? " - " + e.skipReason : ""}`,
            );
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Failed to explain policy:\n${err.message}`);
        process.exit(1);
      }
    });
}
