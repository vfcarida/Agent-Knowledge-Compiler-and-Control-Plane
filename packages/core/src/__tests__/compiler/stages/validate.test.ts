import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ValidateStage } from "../../../compiler/stages/validate.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { Capability } from "../../../ir/types.js";

function baseContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    bundlePath: "/bundle",
    options: {},
    rawItems: [],
    concepts: [],
    links: [],
    sourceHashes: {},
    skippedCount: 0,
    warnings: [],
    ...overrides,
  };
}

function validCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "cap-1",
    kind: "tool",
    name: "Send Email",
    description: "Sends an email on behalf of the user.",
    version: "1.0.0",
    riskLevel: "medium",
    sideEffects: "external-submit",
    ...overrides,
  };
}

describe("ValidateStage", () => {
  it("passes a valid capabilities array through unchanged in shape", async () => {
    const capability = validCapability();
    const context = baseContext({ options: { capabilities: [capability] } });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toHaveLength(1);
    expect(result.options.capabilities![0]).toMatchObject(capability);
  });

  it("mutates and returns the same context reference on success", async () => {
    const context = baseContext({
      options: { capabilities: [validCapability()] },
    });

    const result = await new ValidateStage().execute(context);

    expect(result).toBe(context);
  });

  it("throws a ZodError when capabilities are missing required fields", async () => {
    const invalidCapability = {
      id: "cap-1",
      // missing kind, name, description, version, riskLevel, sideEffects
    };
    const context = baseContext({
      options: { capabilities: [invalidCapability as any] },
    });

    await expect(new ValidateStage().execute(context)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it("throws a ZodError when a capability field has the wrong enum value", async () => {
    const invalidCapability = validCapability({
      riskLevel: "extreme" as any,
    });
    const context = baseContext({
      options: { capabilities: [invalidCapability] },
    });

    await expect(new ValidateStage().execute(context)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it("is a no-op when capabilities is undefined", async () => {
    const context = baseContext({ options: {} });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toBeUndefined();
  });

  it("is a no-op when capabilities is an empty array", async () => {
    const context = baseContext({ options: { capabilities: [] } });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toEqual([]);
  });
});
