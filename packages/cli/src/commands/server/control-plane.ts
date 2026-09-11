import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerControlPlaneCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let controlPlaneCmd = program.commands.find(
    (c) => c.name() === "control-plane",
  );
  if (!controlPlaneCmd) {
    controlPlaneCmd = program
      .command("control-plane")
      .description(
        "[Experimental] Manage runtime governance, policies, and HITL approvals",
      );
  }

  // Subcommand: inspect
  controlPlaneCmd
    .command("inspect")
    .description(
      "Inspect runtime governance state, policies, and active capabilities",
    )
    .argument(
      "[bundle]",
      "Path to OKF bundle or directory containing akcp.yaml",
      ".",
    )
    .option("--ir <path>", "Path to compiled Agent Knowledge IR json")
    .option("--json", "Output inspection details as JSON", false)
    .action(async (bundleInput, options) => {
      const path = await import("path");
      const fs = await import("fs");
      const {
        compile: compileToIR,
        AgentKnowledgeIRSchema,
        extractGatewayPolicies,
      } = await import("@akcp/core");
      type AgentKnowledgeIR = import("@akcp/core").AgentKnowledgeIR;

      try {
        const targetDir = path.resolve(process.cwd(), bundleInput);
        let ir: AgentKnowledgeIR;

        if (options.ir) {
          const irPath = path.resolve(process.cwd(), options.ir);
          ir = AgentKnowledgeIRSchema.parse(
            JSON.parse(fs.readFileSync(irPath, "utf-8")),
          );
        } else {
          const compiledArtifact = path.join(
            targetDir,
            "dist",
            "agent-knowledge-ir.json",
          );
          if (fs.existsSync(compiledArtifact)) {
            ir = AgentKnowledgeIRSchema.parse(
              JSON.parse(fs.readFileSync(compiledArtifact, "utf-8")),
            );
          } else {
            const compileResult = await compileToIR(targetDir);
            if (!compileResult.ok) {
              throw new Error(
                `Failed to compile bundle at ${targetDir}: ${compileResult.error.map((e: any) => e.message).join("; ")}`,
              );
            }
            ir = compileResult.value.ir;
          }
        }

        const gatewayPolicies = extractGatewayPolicies(ir);
        const policyNames = Object.keys(gatewayPolicies);
        const capabilities = ir.capabilities || [];

        const riskBreakdown = {
          low: capabilities.filter((c) => c.riskLevel === "low").length,
          medium: capabilities.filter((c) => c.riskLevel === "medium").length,
          high: capabilities.filter((c) => c.riskLevel === "high").length,
          critical: capabilities.filter((c) => c.riskLevel === "critical")
            .length,
        };

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                bundleId: ir.bundleId,
                buildId: ir.buildId,
                irVersion: ir.irVersion,
                policies: ir.policies || {},
                gatewayPolicies: policyNames,
                capabilitiesCount: capabilities.length,
                riskBreakdown,
                capabilities,
              },
              null,
              2,
            ),
          );
          return;
        }

        console.log("=== AKCP Control Plane Runtime State ===");
        console.log(`Bundle ID:        ${ir.bundleId}`);
        console.log(`Build ID:         ${ir.buildId}`);
        console.log(`IR Version:       ${ir.irVersion}`);
        console.log("");
        console.log("--- Governance Policies ---");
        console.log(
          `Default Autonomy: ${ir.policies?.defaultAutonomyLevel || "read-only"}`,
        );
        console.log(
          `Dangerous Tools:  ${ir.policies?.disableDangerousTools ? "DISABLED (Enforced)" : "ALLOWED"}`,
        );
        console.log(
          `PII Handling:     ${ir.policies?.piiHandling || "default"}`,
        );
        console.log(
          `Approval Required:${ir.policies?.requireApprovalFor?.length ? " " + ir.policies.requireApprovalFor.join(", ") : " None declared"}`,
        );
        console.log(
          `Policy Cards:     ${policyNames.length > 0 ? policyNames.join(", ") : "None declared"}`,
        );
        console.log("");
        console.log("--- Capabilities & Tools ---");
        console.log(`Total Count:      ${capabilities.length}`);
        console.log(
          `Risk Levels:      Low: ${riskBreakdown.low} | Medium: ${riskBreakdown.medium} | High: ${riskBreakdown.high} | Critical: ${riskBreakdown.critical}`,
        );

        if (capabilities.length > 0) {
          console.log("");
          console.log("Registered Tools:");
          for (const cap of capabilities) {
            const approvalTag = cap.requiresApproval
              ? " [HITL APPROVAL REQUIRED]"
              : "";
            const piiTag = cap.readsPII || cap.writesPII ? " [PII]" : "";
            console.log(
              `  • [${cap.riskLevel.toUpperCase()}] ${cap.id} (${cap.name}) - SideEffects: ${cap.sideEffects}${approvalTag}${piiTag}`,
            );
          }
        }
      } catch (err: any) {
        console.error(
          `[ERROR] Control Plane inspection failed:\n${err.message}`,
        );
        process.exit(1);
      }
    });

  // Subcommand: policies
  controlPlaneCmd
    .command("policies")
    .description("List registered policy cards and governance rules")
    .argument(
      "[bundle]",
      "Path to OKF bundle or directory containing akcp.yaml",
      ".",
    )
    .option(
      "--provider <type>",
      "Filter policy capabilities by provider (internal, cedar, opa)",
      "internal",
    )
    .option("--json", "Output policies as JSON", false)
    .action(async (bundleInput, options) => {
      const path = await import("path");
      const fs = await import("fs");
      const {
        compile: compileToIR,
        AgentKnowledgeIRSchema,
        extractGatewayPolicies,
      } = await import("@akcp/core");
      type AgentKnowledgeIR = import("@akcp/core").AgentKnowledgeIR;

      try {
        const targetDir = path.resolve(process.cwd(), bundleInput);
        let ir: AgentKnowledgeIR;

        const compiledArtifact = path.join(
          targetDir,
          "dist",
          "agent-knowledge-ir.json",
        );
        if (fs.existsSync(compiledArtifact)) {
          ir = AgentKnowledgeIRSchema.parse(
            JSON.parse(fs.readFileSync(compiledArtifact, "utf-8")),
          );
        } else {
          const compileResult = await compileToIR(targetDir);
          if (!compileResult.ok) {
            throw new Error(
              `Failed to compile bundle at ${targetDir}: ${compileResult.error.map((e: any) => e.message).join("; ")}`,
            );
          }
          ir = compileResult.value.ir;
        }

        const gatewayPolicies = extractGatewayPolicies(ir);
        const policyList = Object.entries(gatewayPolicies).map(
          ([id, card]) => ({
            id,
            name: card.metadata?.name || id,
            version: card.metadata?.version || "1.0.0",
            description: card.metadata?.description || "No description",
            appliesTo: card.appliesTo || { capabilities: ["*"] },
            rulesCount: card.rules?.length || 0,
          }),
        );

        if (options.json) {
          console.log(JSON.stringify(policyList, null, 2));
          return;
        }

        console.log(
          `=== AKCP Registered Policy Cards (Provider: ${options.provider}) ===\n`,
        );
        if (policyList.length === 0) {
          console.log(
            "No explicit Policy Cards registered. Default organizational policies apply.",
          );
          if (ir.policies) {
            console.log(
              `Default Autonomy: ${ir.policies.defaultAutonomyLevel || "read-only"}`,
            );
            if (ir.policies.requireApprovalFor?.length) {
              console.log(
                `Approval Gates:   ${ir.policies.requireApprovalFor.join(", ")}`,
              );
            }
          }
        } else {
          for (const p of policyList) {
            console.log(`• ${p.name} (ID: ${p.id}, v${p.version})`);
            console.log(`  Description:   ${p.description}`);
            console.log(
              `  Capabilities:  ${p.appliesTo.capabilities.join(", ")}`,
            );
            console.log(`  Rules Count:   ${p.rulesCount}`);
            console.log("");
          }
        }
      } catch (err: any) {
        console.error(
          `[ERROR] Failed to list control-plane policies:\n${err.message}`,
        );
        process.exit(1);
      }
    });

  // Subcommand: approvals
  controlPlaneCmd
    .command("approvals")
    .description("List and inspect pending and historic HITL approval requests")
    .option(
      "-s, --status <status>",
      "Filter approvals by status: PENDING, APPROVED, REVOKED, EXPIRED, CONSUMED, or ALL",
      "ALL",
    )
    .option(
      "-n, --limit <number>",
      "Maximum number of records to display",
      "20",
    )
    .option("--json", "Output approvals as JSON", false)
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");

      try {
        const candidatePaths = [
          path.resolve(process.cwd(), ".akcp/approvals.json"),
          path.resolve(process.cwd(), "reports/approvals.json"),
        ];

        let approvals: any[] = [];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            try {
              approvals = JSON.parse(fs.readFileSync(p, "utf-8"));
              break;
            } catch {
              // ignore parse errors on corrupt files
            }
          }
        }

        const filterStatus = options.status.toUpperCase();
        let filtered = approvals;
        if (filterStatus !== "ALL") {
          filtered = approvals.filter(
            (a) => (a.status || "").toUpperCase() === filterStatus,
          );
        }

        filtered = filtered.slice(0, Number(options.limit));

        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
          return;
        }

        console.log(
          `=== AKCP Human-In-The-Loop Approvals (Filter: ${filterStatus}) ===\n`,
        );
        if (filtered.length === 0) {
          console.log("No approval records found matching the criteria.");
        } else {
          for (const a of filtered) {
            console.log(`• Token:       ${a.token}`);
            console.log(`  Status:      ${a.status}`);
            console.log(`  Capability:  ${a.capabilityId}`);
            console.log(`  RequestedBy: ${a.requestedBy}`);
            console.log(`  RiskLevel:   ${a.riskLevel}`);
            if (a.createdAt) {
              console.log(
                `  CreatedAt:   ${new Date(a.createdAt).toISOString()}`,
              );
            }
            console.log("");
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Failed to query approvals:\n${err.message}`);
        process.exit(1);
      }
    });

  // Subcommand: audit
  controlPlaneCmd
    .command("audit")
    .description("Query or tail the runtime audit log events")
    .option("-f, --file <path>", "Path to audit log file")
    .option(
      "-n, --lines <number>",
      "Number of latest log entries to display",
      "20",
    )
    .option(
      "--filter <action>",
      "Filter by event action (e.g. capability.invoke, policy.evaluate)",
    )
    .option("--json", "Output audit entries as JSON", false)
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { FileAuditLogService } = await import("@akcp/core");

      try {
        const candidatePaths = options.file
          ? [path.resolve(process.cwd(), options.file)]
          : [
              path.resolve(process.cwd(), ".akcp/audit.log"),
              path.resolve(process.cwd(), "reports/audit.log"),
              path.resolve(process.cwd(), "audit.log"),
            ];

        let activePath: string | null = null;
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            activePath = p;
            break;
          }
        }

        if (!activePath) {
          if (options.json) {
            console.log(JSON.stringify([], null, 2));
          } else {
            console.log("=== AKCP Runtime Audit Trail ===");
            console.log(
              "No audit log file found. Ensure the control-plane gateway is running with audit logging enabled.",
            );
          }
          return;
        }

        const auditService = new FileAuditLogService(activePath);
        let events = await auditService.getEvents(Number(options.lines) * 2);

        if (options.filter) {
          events = events.filter((e) => e.action.includes(options.filter));
        }

        events = events.slice(-Number(options.lines));

        if (options.json) {
          console.log(JSON.stringify(events, null, 2));
          return;
        }

        console.log(
          `=== AKCP Runtime Audit Trail (Source: ${activePath}) ===\n`,
        );
        if (events.length === 0) {
          console.log("No audit events recorded matching criteria.");
        } else {
          for (const e of events) {
            const decisionTag = e.decision.toUpperCase();
            console.log(
              `[${e.timestamp}] ${decisionTag} - ${e.action} (Actor: ${e.actor}, Risk: ${e.riskLevel})`,
            );
            if (e.capabilityId) {
              console.log(`    Capability: ${e.capabilityId}`);
            }
            if (e.evidence?.reason) {
              console.log(`    Reason:     ${e.evidence.reason}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Failed to read audit log:\n${err.message}`);
        process.exit(1);
      }
    });
}
