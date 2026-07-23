import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { z } from "zod";
import { CapabilitySchema } from "../../ir/schema.js";

export class ValidateStage implements PipelineStage {
  name = "validate";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Validate capabilities schema
    if (context.options.capabilities && context.options.capabilities.length > 0) {
      const validated = z.array(CapabilitySchema).parse(context.options.capabilities);
      context.options.capabilities = validated;
    }

    return context;
  }
}
