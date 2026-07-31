import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { z } from "zod";
import { CapabilitySchema } from "../../ir/schema.js";

/**
 * Validates config fragments that are available mid-pipeline (currently: declared
 * capabilities). The full AgentKnowledgeIR envelope doesn't exist yet at this point —
 * it's assembled in run-pipeline.ts after all stages run — so schema validation of the
 * *complete* AK-IR happens there (via AgentKnowledgeIRSchema) immediately after assembly,
 * not in this stage.
 */
export class ValidateStage implements PipelineStage {
  name = "validate";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Validate capabilities schema
    if (
      context.options.capabilities &&
      context.options.capabilities.length > 0
    ) {
      const validated = z
        .array(CapabilitySchema)
        .parse(context.options.capabilities);
      context.options.capabilities = validated;
    }

    return context;
  }
}
