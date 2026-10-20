import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerGraphContradictionsCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let graphCmd = program.commands.find((c) => c.name() === "graph");
  if (!graphCmd) {
    graphCmd = program
      .command("graph")
      .description("Semantic Knowledge Graph operations");
  }

  graphCmd
    .command("contradictions")
    .description(
      "Detect normative polarity conflicts (MUST vs NEVER), numeric SLA divergences, and stale dependency overrides across the knowledge graph",
    )
    .option("-b, --bundle <directory>", "Path to the OKF bundle directory", ".")
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .option("--strict", "Exit with code 1 if any contradiction is found", false)
    .action(async (options) => {
      const path = await import("path");
      const fs = await import("fs");
      const { compile, AgentKnowledgeIRSchema, detectKnowledgeContradictions } =
        await import("@akcp/core");
      type AgentKnowledgeIR = import("@akcp/core").AgentKnowledgeIR;

      try {
        const targetDir = path.resolve(process.cwd(), options.bundle);
        const compiledIrPath = path.join(
          targetDir,
          "dist",
          "agent-knowledge-ir.json",
        );

        let ir: AgentKnowledgeIR;
        if (fs.existsSync(compiledIrPath)) {
          ir = AgentKnowledgeIRSchema.parse(
            JSON.parse(fs.readFileSync(compiledIrPath, "utf-8")),
          );
        } else {
          const compileRes = await compile(targetDir);
          if (!compileRes.ok) {
            throw new Error(
              compileRes.error.map((e: any) => e.message).join("; "),
            );
          }
          ir = compileRes.value.ir;
        }

        const report = detectKnowledgeContradictions(ir);

        if (options.format === "json") {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log("=== AKCP Epistemic Contradiction & Drift Report ===");
          console.log(`Bundle:             ${targetDir}`);
          console.log(`Concepts Analyzed:  ${report.totalConceptsAnalyzed}`);
          console.log(`Contradictions:     ${report.contradictionsFound}`);
          if (report.contradictions.length === 0) {
            console.log(
              "[OK] Zero normative or SLA contradictions detected across the knowledge graph.",
            );
          } else {
            console.log("\nDetected Contradictions:");
            for (const c of report.contradictions) {
              const badge = c.severity === "error" ? "[ERROR]" : "[WARN]";
              console.log(
                `  ${badge} [${c.kind}] ${c.conceptA} <-> ${c.conceptB}`,
              );
              console.log(`         ${c.explanation}`);
              console.log(`         - ${c.conceptA}: "${c.statementA}"`);
              console.log(`         - ${c.conceptB}: "${c.statementB}"`);
            }
          }
        }

        if (
          report.hasCriticalContradictions ||
          (options.strict && report.contradictionsFound > 0)
        ) {
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`[ERROR] Contradiction analysis failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
