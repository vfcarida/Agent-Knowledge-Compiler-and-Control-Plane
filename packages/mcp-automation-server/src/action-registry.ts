import { z } from "zod";
import { compileJsonSchemaToZod, type AgentKnowledgeIR } from "@akcp/core";

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
  outputSchema?: z.ZodSchema;
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

        // Deterministically compile JSON Schema into runtime Zod contracts
        const parameters = capability.inputsSchema
          ? compileJsonSchemaToZod(capability.inputsSchema)
          : z.record(z.unknown());
        const outputSchema = capability.outputsSchema
          ? compileJsonSchemaToZod(capability.outputsSchema)
          : undefined;

        const defaultHandler = async (
          params: unknown,
          _context: ActionContext,
        ): Promise<ActionResult> => {
          const inputCheck = parameters.safeParse(params);
          if (!inputCheck.success) {
            return {
              success: false,
              error: `Input contract violation for '${capability.name}': ${inputCheck.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`,
            };
          }
          return {
            success: true,
            data: {
              message: `[Simulated] Generic execution for ${capability.name}`,
              params: inputCheck.data,
            },
          };
        };

        this.actions.set(capability.name, {
          id: capability.name,
          description: capability.description,
          riskLevel: capability.riskLevel as
            "low" | "medium" | "high" | "critical",
          parameters,
          outputSchema,
          handler: existing?.handler || defaultHandler,
        });
      }
    }
  }

  async execute(
    id: string,
    params: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const action = this.actions.get(id);
    if (!action || !action.handler) {
      return { success: false, error: `Action '${id}' not found` };
    }
    const inputCheck = action.parameters.safeParse(params);
    if (!inputCheck.success) {
      return {
        success: false,
        error: `Input contract violation for '${id}': ${inputCheck.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`,
      };
    }
    const result = await action.handler(inputCheck.data, context);
    if (result.success && action.outputSchema && result.data !== undefined) {
      const outputCheck = action.outputSchema.safeParse(result.data);
      if (!outputCheck.success) {
        return {
          success: false,
          error: `Output contract violation for '${id}': ${outputCheck.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")}`,
        };
      }
    }
    return result;
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
