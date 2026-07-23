import { Command } from "commander";
import type { CLIContext } from "../types.js";

// Core
import { registerInitCommand } from "./core/init.js";
import { registerValidateCommand } from "./core/validate.js";
import { registerCompileCommand } from "./core/compile.js";
import { registerScanCommand } from "./core/scan.js";
import { registerInspectCommand } from "./core/inspect.js";
import { registerVerifyCommand } from "./core/verify.js";
import { registerDoctorCommand } from "./core/doctor.js";

// Governance
import { registerPolicyValidateCommand } from "./governance/policy-validate.js";
import { registerPolicyExplainCommand } from "./governance/policy-explain.js";
import { registerConformanceRunCommand } from "./governance/conformance-run.js";

// Graph
import { registerGraphBuildCommand } from "./graph/build.js";
import { registerGraphInspectCommand } from "./graph/inspect.js";
import { registerGraphImpactedCommand } from "./graph/impacted.js";

// Context
import { registerContextPlanCommand } from "./context/plan.js";
import { registerScorecardCommand } from "./context/scorecard.js";
import { registerLifecycleReportCommand } from "./context/lifecycle-report.js";

// Server
import { registerServeMcpCommand } from "./server/serve-mcp.js";
import { registerServeDashboardCommand } from "./server/serve-dashboard.js";
import { registerControlPlaneCommand } from "./server/control-plane.js";

// Utility
import { registerAgentsSyncCommand } from "./utility/agents-sync.js";
import { registerDocsCommand } from "./utility/docs.js";
import { registerPluginCommand } from "./utility/plugin.js";
import { registerPrivacyCommand } from "./utility/privacy.js";
import { registerCompletionCommand } from "./utility/completion.js";
import { registerImportCommand } from "./utility/import.js";
import { registerEvalsCommand } from "./utility/evals.js";
import { registerPlanCommand } from "./utility/plan.js";
import { registerReconcileCommand } from "./utility/reconcile.js";
import { registerConfigValidateCommand } from "./utility/config-validate.js";
import { registerDiffCommand } from "./utility/diff.js";

export function registerAllCommands(program: Command, ctx: CLIContext): void {
  // Core
  registerInitCommand(program, ctx);
  registerValidateCommand(program, ctx);
  registerCompileCommand(program, ctx);
  registerScanCommand(program, ctx);
  registerInspectCommand(program, ctx);
  registerVerifyCommand(program, ctx);
  registerDoctorCommand(program, ctx);

  // Governance
  registerPolicyValidateCommand(program, ctx);
  registerPolicyExplainCommand(program, ctx);
  registerConformanceRunCommand(program, ctx);

  // Graph
  registerGraphBuildCommand(program, ctx);
  registerGraphInspectCommand(program, ctx);
  registerGraphImpactedCommand(program, ctx);

  // Context
  registerContextPlanCommand(program, ctx);
  registerScorecardCommand(program, ctx);
  registerLifecycleReportCommand(program, ctx);

  // Server
  registerServeMcpCommand(program, ctx);
  registerServeDashboardCommand(program, ctx);
  registerControlPlaneCommand(program, ctx);

  // Utility
  registerAgentsSyncCommand(program, ctx);
  registerDocsCommand(program, ctx);
  registerPluginCommand(program, ctx);
  registerPrivacyCommand(program, ctx);
  registerCompletionCommand(program, ctx);
  registerImportCommand(program, ctx);
  registerEvalsCommand(program, ctx);
  registerPlanCommand(program, ctx);
  registerReconcileCommand(program, ctx);
  registerConfigValidateCommand(program, ctx);
  registerDiffCommand(program, ctx);
}
