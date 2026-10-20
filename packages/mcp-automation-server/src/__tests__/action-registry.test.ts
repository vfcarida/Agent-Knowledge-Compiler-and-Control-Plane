import { describe, it, expect, vi } from "vitest";
import { ActionRegistry } from "../action-registry.js";
import { z } from "zod";

describe("ActionRegistry", () => {
  it("registers actions directly", () => {
    const registry = new ActionRegistry();
    const mockHandler = vi.fn();

    registry.register({
      id: "test_action",
      description: "A test action",
      domain: "test",
      riskLevel: "low",
      parameters: z.object({ foo: z.string() }),
      handler: mockHandler,
    });

    const action = registry.get("test_action");
    expect(action).toBeDefined();
    expect(action?.domain).toBe("test");
  });

  it("filters actions by domain and riskLevel", () => {
    const registry = new ActionRegistry();

    registry.register({
      id: "action_1",
      description: "",
      domain: "domainA",
      riskLevel: "low",
      parameters: z.object({}),
    });
    registry.register({
      id: "action_2",
      description: "",
      domain: "domainA",
      riskLevel: "high",
      parameters: z.object({}),
    });
    registry.register({
      id: "action_3",
      description: "",
      domain: "domainB",
      riskLevel: "low",
      parameters: z.object({}),
    });

    expect(registry.list({ domain: "domainA" })).toHaveLength(2);
    expect(registry.list({ riskLevel: "low" })).toHaveLength(2);
    expect(
      registry.list({ domain: "domainA", riskLevel: "high" }),
    ).toHaveLength(1);
    expect(registry.list()).toHaveLength(3);
  });

  it("registers actions from compiled IR capabilities", () => {
    const registry = new ActionRegistry();

    const mockIR: any = {
      capabilities: [
        {
          name: "ir_action_1",
          kind: "tool",
          description: "From IR",
          riskLevel: "medium",
          inputsSchema: {
            type: "object",
            properties: { a: { type: "string" } },
          },
        },
        {
          name: "ir_resource_1",
          kind: "resource",
          description: "Not a tool",
          riskLevel: "low",
        },
      ],
    };

    registry.registerFromIR(mockIR);

    // Should only register kind === "tool"
    expect(registry.list()).toHaveLength(1);
    const action = registry.get("ir_action_1");
    expect(action).toBeDefined();
    expect(action?.id).toBe("ir_action_1");
    expect(action?.description).toBe("From IR");
    expect(action?.riskLevel).toBe("medium");
    expect(typeof action?.handler).toBe("function"); // IR now gets a simulated fallback handler
  });

  it("preserves manual handlers when updating from IR", () => {
    const registry = new ActionRegistry();
    const mockHandler = vi.fn();

    registry.register({
      id: "ir_action_1",
      description: "Old description",
      riskLevel: "low",
      parameters: z.object({}),
      handler: mockHandler,
    });

    const mockIR: any = {
      capabilities: [
        {
          name: "ir_action_1",
          kind: "tool",
          description: "New description from IR",
          riskLevel: "critical",
        },
      ],
    };

    registry.registerFromIR(mockIR);

    const updated = registry.get("ir_action_1");
    expect(updated?.description).toBe("New description from IR");
    expect(updated?.riskLevel).toBe("critical");
    // Handler should be preserved
    expect(updated?.handler).toBe(mockHandler);
  });

  it("compiles inputsSchema and outputsSchema from IR into strict Zod validators and enforces contracts via execute()", async () => {
    const registry = new ActionRegistry();
    const mockIR: any = {
      capabilities: [
        {
          name: "create_ticket",
          kind: "tool",
          description: "Create a support ticket",
          riskLevel: "medium",
          inputsSchema: {
            type: "object",
            required: ["subject", "severity"],
            additionalProperties: false,
            properties: {
              subject: { type: "string", minLength: 5 },
              severity: { enum: ["low", "high", "critical"] },
            },
          },
          outputsSchema: {
            type: "object",
            required: ["ticketId"],
            properties: {
              ticketId: { type: "string" },
            },
          },
        },
      ],
    };

    registry.registerFromIR(mockIR);

    // Invalid input should fail contract check
    const badInput = await registry.execute("create_ticket", {
      subject: "hi",
      severity: "invalid",
    });
    expect(badInput.success).toBe(false);
    expect(badInput.error).toContain("Input contract violation");

    // Valid input but simulated output lacks ticketId -> fails output contract check
    const badOutput = await registry.execute("create_ticket", {
      subject: "Database outage",
      severity: "critical",
    });
    expect(badOutput.success).toBe(false);
    expect(badOutput.error).toContain("Output contract violation");
  });
});
