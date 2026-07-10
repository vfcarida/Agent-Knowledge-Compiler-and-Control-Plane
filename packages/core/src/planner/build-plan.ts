import type { AkcpConfig } from '../config/akcp-config-schema.js';

export interface BuildPlan {
  sourcesToRead: string[];
  targetsToGenerate: string[];
  budgets: {
    maxTokens?: number;
    maxDocuments?: number;
  };
  activePolicies: string[];
  activeEvalGates: string[];
  mcpExports: {
    profileServerEnabled: boolean;
    automationServerEnabled: boolean;
  };
}

/**
 * Transforms an AkcpConfig into a deterministic execution plan.
 * The build plan dictates exactly what compile/reconcile will do.
 */
export function generateBuildPlan(config: AkcpConfig): BuildPlan {
  const sourcesToRead = config.compile.sources.map(s => {
    let desc = s.path || s.url || s.type;
    if (s.exclude && s.exclude.length > 0) {
      desc += ` (excluding ${s.exclude.join(', ')})`;
    }
    return desc;
  });

  const activePolicies: string[] = [];
  if (config.controlPlane?.policies?.disableDangerousTools) {
    activePolicies.push('disableDangerousTools');
  }
  if (config.controlPlane?.policies?.requireApprovalFor?.length) {
    activePolicies.push(`requireApprovalFor: ${config.controlPlane.policies.requireApprovalFor.join(', ')}`);
  }

  const activeEvalGates = config.controlPlane?.evalGates?.map(g => `${g.name} (strict: ${g.strict})`) || [];

  return {
    sourcesToRead,
    targetsToGenerate: config.compile.targets.map(t => `${t.type} (${t.out})`),
    budgets: {
      maxTokens: config.compile.budgets?.maxTokens,
      maxDocuments: config.compile.budgets?.maxDocuments,
    },
    activePolicies,
    activeEvalGates,
    mcpExports: {
      profileServerEnabled: config.controlPlane?.mcp?.profileServer?.enabled ?? true,
      automationServerEnabled: config.controlPlane?.mcp?.automationServer?.enabled ?? false,
    }
  };
}

export function printBuildPlan(plan: BuildPlan): string {
  const lines: string[] = [];
  lines.push('--- AKCP Build Plan ---');
  
  lines.push('\n[Sources]');
  plan.sourcesToRead.forEach(s => lines.push(`  - Read: ${s}`));
  
  lines.push('\n[Targets]');
  plan.targetsToGenerate.forEach(t => lines.push(`  - Generate: ${t}`));

  if (plan.budgets.maxTokens || plan.budgets.maxDocuments) {
    lines.push('\n[Budgets]');
    if (plan.budgets.maxTokens) lines.push(`  - Max Tokens: ${plan.budgets.maxTokens}`);
    if (plan.budgets.maxDocuments) lines.push(`  - Max Documents: ${plan.budgets.maxDocuments}`);
  }

  lines.push('\n[Policies]');
  if (plan.activePolicies.length === 0) {
    lines.push('  - None');
  } else {
    plan.activePolicies.forEach(p => lines.push(`  - ${p}`));
  }

  lines.push('\n[Eval Gates]');
  if (plan.activeEvalGates.length === 0) {
    lines.push('  - None');
  } else {
    plan.activeEvalGates.forEach(e => lines.push(`  - ${e}`));
  }

  lines.push('\n[MCP Exports]');
  lines.push(`  - Profile Server: ${plan.mcpExports.profileServerEnabled ? 'Enabled' : 'Disabled'}`);
  lines.push(`  - Automation Server: ${plan.mcpExports.automationServerEnabled ? 'Enabled' : 'Disabled'}`);

  return lines.join('\n');
}
