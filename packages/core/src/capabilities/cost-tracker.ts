/**
 * @module capabilities/cost-tracker
 * @description In-memory per-agent token/cost tracking at the gateway level.
 */

import { agentTokensConsumedCounter } from "../observability/otel.js";

export interface AgentUsage {
  agentId: string;
  cumulativeTokens: number;
  callCount: number;
  lastCallTokens: number;
  lastCallAt: string;
  budgetExceeded: boolean;
  budget?: number;
}

export interface CostUsageRecord {
  agentId: string;
  tokens: number;
  cumulativeTokens: number;
  budgetExceeded: boolean;
  budget?: number;
}

export interface CostTrackerConfig {
  /** Default token budget applied to all agents without specific budgets */
  defaultBudget?: number;
  /** Per-agent token budget limits */
  agentBudgets?: Record<string, number>;
  /** Optional callback fired when an agent exceeds its budget */
  onBudgetExceeded?: (
    agentId: string,
    usage: AgentUsage,
    budget: number,
  ) => void;
}

/**
 * Calculates estimated tokens from payload and response objects using a character heuristic (4 chars per token).
 */
export function estimateTokens(payload: unknown, result: unknown): number {
  let text = "";
  try {
    if (payload !== undefined && payload !== null) {
      text += typeof payload === "string" ? payload : JSON.stringify(payload);
    }
    if (result !== undefined && result !== null) {
      text += typeof result === "string" ? result : JSON.stringify(result);
    }
  } catch {
    text = String(payload ?? "") + String(result ?? "");
  }

  const length = text.length;
  if (length === 0) return 1;
  return Math.max(1, Math.ceil(length / 4));
}

/**
 * Tracks and accumulates token usage per agent across tool executions,
 * emitting OpenTelemetry metrics and logging budget warnings.
 */
export class CostTracker {
  private usageMap = new Map<string, AgentUsage>();
  private budgets = new Map<string, number>();
  private defaultBudget?: number;
  private onBudgetExceeded?: (
    agentId: string,
    usage: AgentUsage,
    budget: number,
  ) => void;

  constructor(config?: CostTrackerConfig) {
    this.defaultBudget = config?.defaultBudget;
    this.onBudgetExceeded = config?.onBudgetExceeded;

    if (config?.agentBudgets) {
      for (const [agentId, budget] of Object.entries(config.agentBudgets)) {
        this.budgets.set(agentId, budget);
      }
    }
  }

  /**
   * Estimates tokens for a given payload and execution result.
   */
  public estimateTokens(payload: unknown, result: unknown): number {
    return estimateTokens(payload, result);
  }

  /**
   * Sets or updates the token budget for a specific agent.
   */
  public setBudget(agentId: string, maxTokens: number): void {
    this.budgets.set(agentId, maxTokens);
  }

  /**
   * Gets the configured token budget for an agent.
   */
  public getBudget(agentId: string): number | undefined {
    return this.budgets.get(agentId) ?? this.defaultBudget;
  }

  /**
   * Records token usage for an agent, emits OTel metrics, checks budgets, and returns the usage record.
   */
  public recordUsage(
    agentId: string,
    tokens: number,
    toolName?: string,
  ): CostUsageRecord {
    const key = agentId || "anonymous";
    const budget = this.getBudget(key);
    const existing = this.usageMap.get(key);

    const now = new Date().toISOString();
    const cumulativeTokens = (existing?.cumulativeTokens ?? 0) + tokens;
    const callCount = (existing?.callCount ?? 0) + 1;
    const budgetExceeded = budget !== undefined && cumulativeTokens > budget;

    const usage: AgentUsage = {
      agentId: key,
      cumulativeTokens,
      callCount,
      lastCallTokens: tokens,
      lastCallAt: now,
      budgetExceeded,
      budget,
    };

    this.usageMap.set(key, usage);

    // Emit OpenTelemetry counter metric
    try {
      agentTokensConsumedCounter.add(tokens, {
        agentId: key,
        ...(toolName ? { toolName } : {}),
      });
    } catch {
      // Telemetry errors should not break request execution
    }

    // Soft budget enforcement: log warning and invoke callback if budget is exceeded
    if (budgetExceeded) {
      console.warn(
        `[CostTracker] Warning: Agent '${key}' exceeded token budget limit (${cumulativeTokens}/${budget} tokens consumed).`,
      );
      if (this.onBudgetExceeded) {
        try {
          this.onBudgetExceeded(key, usage, budget);
        } catch {
          // Callback errors should not break request flow
        }
      }
    }

    return {
      agentId: key,
      tokens,
      cumulativeTokens,
      budgetExceeded,
      budget,
    };
  }

  /**
   * Gets cumulative tokens consumed by an agent.
   */
  public getCumulativeTokens(agentId: string): number {
    return this.usageMap.get(agentId || "anonymous")?.cumulativeTokens ?? 0;
  }

  /**
   * Gets detailed usage stats for an agent.
   */
  public getUsage(agentId: string): AgentUsage | undefined {
    return this.usageMap.get(agentId || "anonymous");
  }

  /**
   * Checks if an agent has exceeded its configured token budget.
   */
  public isBudgetExceeded(agentId: string): boolean {
    const usage = this.usageMap.get(agentId || "anonymous");
    return usage?.budgetExceeded ?? false;
  }

  /**
   * Returns a snapshot of usage records for all tracked agents.
   */
  public getAllUsage(): Record<string, AgentUsage> {
    const result: Record<string, AgentUsage> = {};
    for (const [key, value] of this.usageMap.entries()) {
      result[key] = { ...value };
    }
    return result;
  }

  /**
   * Resets usage tracking for a specific agent or all agents.
   */
  public reset(agentId?: string): void {
    if (agentId) {
      this.usageMap.delete(agentId);
    } else {
      this.usageMap.clear();
    }
  }
}
