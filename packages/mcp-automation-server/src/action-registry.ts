import { z } from "zod";
import type { AgentKnowledgeIR } from "@akcp/core";

export interface ActionContext {
  domain?: string;
  agentId?: string;
  approvalToken?: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface ActionDefinition {
  id: string;
  description: string;
  domain?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  parameters: z.ZodSchema;
  handler?: (params: unknown, context: ActionContext) => Promise<ActionResult>;
}

export class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();

  register(action: ActionDefinition): void {
    this.actions.set(action.id, action);
  }

  registerFromIR(ir: AgentKnowledgeIR): void {
    // Extract executable actions (capabilities of kind 'tool') from compiled IR
    for (const capability of ir.capabilities ?? []) {
      if (capability.kind === "tool") {
        // We do not overwrite an existing handler if it was manually registered
        const existing = this.actions.get(capability.name);

        // We dynamically build a simple ZodSchema if inputsSchema is present
        let parameters = z.record(z.unknown());
        if (capability.inputsSchema) {
          // For simplicity in this generic registry, we just use a record schema,
          // but a real implementation could compile JSON schema to Zod.
          parameters = z.record(z.unknown());
        }

        this.actions.set(capability.name, {
          id: capability.name,
          description: capability.description,
          riskLevel: capability.riskLevel as
            "low" | "medium" | "high" | "critical",
          parameters,
          handler:
            existing?.handler ||
            (async (params: unknown, _context: ActionContext) => {
              return {
                success: true,
                data: {
                  message: `[Simulated] Generic execution for ${capability.name}`,
                  params,
                },
              };
            }),
        });
      }
    }
  }

  get(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  list(filters?: { domain?: string; riskLevel?: string }): ActionDefinition[] {
    return [...this.actions.values()].filter((a) => {
      if (filters?.domain && a.domain !== filters.domain) return false;
      if (filters?.riskLevel && a.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }
}
