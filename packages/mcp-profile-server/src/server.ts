/**
 * @module server
 * @description Configures tools, resources, and prompts dynamically for the MCP Profile Server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import crypto from "node:crypto";
import {
  mcpToolCallsCounter,
  mcpToolFailuresCounter,
  createToolSuccess,
  createToolFailure,
  withToolTracing,
  MCPGateway,
  type GatewayConfig,
  type AgentKnowledgeIR,
  LakeraGateway,
  type ISecurityGateway,
} from "@akcp/core";

export class AKCPProfileServer {
  private readonly server: McpServer;
  private readonly gateway: MCPGateway;
  private readonly ir: AgentKnowledgeIR;
  private readonly agentIdentity: string;
  private readonly securityGateway: ISecurityGateway;

  constructor(
    ir: AgentKnowledgeIR,
    gatewayConfig: GatewayConfig = { policies: {} },
    agentIdentity: string = "mcp-client",
  ) {
    this.ir = ir;
    this.gateway = new MCPGateway(gatewayConfig);
    this.agentIdentity = agentIdentity;
    this.securityGateway = new LakeraGateway();

    // Create the MCP server instance
    this.server = new McpServer({
      name: "akcp-profile-server",
      version: "1.0.0",
    });

    this.registerResources();
    this.registerTools();
  }

  getServerInstance(): McpServer {
    return this.server;
  }

  /**
   * Register resources dynamically based on the AgentKnowledgeIR concepts.
   */
  private registerResources(): void {
    if (!this.ir.concepts || this.ir.concepts.length === 0) {
      console.warn(
        "[AKCP Profile Server] No concepts found in IR to register as resources.",
      );
      return;
    }

    for (const concept of this.ir.concepts) {
      if (concept.conceptId.includes("..")) {
        console.warn(
          `[SECURITY] Skipping resource with invalid path traversal in ID: ${concept.conceptId}`,
        );
        continue;
      }

      const uri = `knowledge://${this.ir.bundleId}/${concept.conceptId}`;
      const name = concept.conceptId.replace(/\//g, "-");

      this.server.resource(
        name,
        uri,
        {
          mimeType: "text/markdown",
          description: `Knowledge asset: ${concept.conceptId} (Type: ${concept.type})`,
        },
        async () => {
          const summaryStr = concept.frontmatter.summary
            ? `\n> Summary: ${concept.frontmatter.summary}\n`
            : "";
          return {
            contents: [
              {
                uri,
                mimeType: "text/markdown",
                text: `---\n${JSON.stringify(concept.frontmatter, null, 2)}\n---${summaryStr}\n\n${concept.body}`,
              },
            ],
          };
        },
      );
    }
  }

  /**
   * Register tools dynamically based on capabilities defined in the IR.
   */
  private registerTools(): void {
    const capabilities = this.ir.capabilities || [];

    // Filter out only tools

    const tools = capabilities.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cap: any) =>
        cap.kind === "tool" ||
        cap.kind === "mcp-tool" ||
        cap.type === "tool" ||
        cap.type === "mcp-tool",
    );

    if (tools.length === 0) {
      console.warn("[AKCP Profile Server] No tool capabilities found in IR.");
    }

    // Add read_document_chunk tool for Context Pagination
    this.server.tool(
      "read_document_chunk",
      "Read a paginated chunk of a specific knowledge concept to avoid context window collapse.",
      {
        conceptId: z.string().describe("The conceptId of the document to read"),
        offset: z
          .number()
          .default(0)
          .describe("Character offset to start reading from"),
        limit: z
          .number()
          .default(4000)
          .describe("Maximum number of characters to read (chunk size)"),
        summaryOnly: z
          .boolean()
          .optional()
          .describe(
            "If true, only returns the summary of the document, if available.",
          ),
      },
      async ({ conceptId, offset, limit, summaryOnly }) => {
        mcpToolCallsCounter.add(1);
        const concept = this.ir.concepts?.find(
          (c) => c.conceptId === conceptId,
        );

        if (!concept) {
          mcpToolFailuresCounter.add(1);
          return {
            isError: true,
            content: [
              { type: "text", text: `Error: Concept ${conceptId} not found.` },
            ],
          };
        }

        let fullText = "";

        if (summaryOnly && concept.frontmatter.summary) {
          fullText = `---\n${JSON.stringify(concept.frontmatter, null, 2)}\n---\n\n> Summary: ${concept.frontmatter.summary}`;
        } else {
          fullText = `---\n${JSON.stringify(concept.frontmatter, null, 2)}\n---\n\n${concept.body}`;
        }

        const chunk = fullText.slice(offset, offset + limit);
        const hasMore = offset + limit < fullText.length;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  conceptId,
                  offset,
                  limit,
                  totalLength: fullText.length,
                  hasMore,
                  chunk,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    for (const cap of tools) {
      if (cap.name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawCap = cap as any;
        const schema =
          cap.inputsSchema || rawCap.inputSchema || rawCap.parameters || {};

        // Convert basic JSON schema to Zod schema dynamically
        const zodShape: Record<string, z.ZodTypeAny> = {};

        if (schema.properties) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const [key, prop] of Object.entries<any>(schema.properties)) {
            let zType: z.ZodTypeAny = z.any();
            if (prop.type === "string") zType = z.string();
            else if (prop.type === "number") zType = z.number();
            else if (prop.type === "boolean") zType = z.boolean();

            if (prop.description) zType = zType.describe(prop.description);

            if (!schema.required || !schema.required.includes(key)) {
              zType = zType.optional();
            }
            zodShape[key] = zType;
          }
        }

        this.server.tool(
          cap.name,
          cap.description || `Tool: ${cap.name}`,
          zodShape,
          async (args) => {
            const reqId = crypto.randomUUID();
            mcpToolCallsCounter.add(1);

            // Gating based on requiresApproval and sideEffects could happen here
            if (cap.requiresApproval) {
              console.warn(
                `[SECURITY] Tool ${cap.name} requires human approval! (Simulated)`,
              );
            }

            // WAF Security Check
            const wafResult = await this.securityGateway.checkPrompt(
              JSON.stringify(args),
            );
            if (wafResult.flagged) {
              mcpToolFailuresCounter.add(1);
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      createToolFailure(
                        `Security Gateway Blocked Execution: ${wafResult.reason}`,
                        "SECURITY_BLOCK",
                        {
                          requestId: reqId,
                          toolName: cap.name,
                          toolVersion: "1.0.0",
                          durationMs: 0,
                        },
                      ),
                      null,
                      2,
                    ),
                  },
                ],
              };
            }

            try {
              let mappedSideEffect: "read" | "write" | "submit" = "read";
              if (cap.sideEffects?.includes("write"))
                mappedSideEffect = "write";
              if (cap.sideEffects === "external-submit")
                mappedSideEffect = "submit";

              const { data, durationMs } = await this.gateway.execute(
                {
                  requestId: reqId,
                  toolName: cap.name,
                  sideEffect: mappedSideEffect,
                  agentId: this.agentIdentity,
                  payload: args,
                },
                async () => {
                  return await withToolTracing(
                    cap.name,
                    "1.0.0",
                    reqId,
                    async () => {
                      let mockResult: unknown = {
                        status: "simulated_success",
                        message: `Tool ${cap.name} executed successfully with args`,
                        args,
                      };

                      if (cap.name === "issue_refund") {
                        mockResult = {
                          status: "pending_hitl_approval",
                          message: `Refund request initiated and sent to Tier 2 for approval.`,
                          transactionId: `txn-${crypto.randomUUID().slice(0, 8)}`,
                          recordedArgs: args,
                        };
                      } else if (cap.name === "delete_customer_data") {
                        mockResult = {
                          status: "escalated_to_legal",
                          message: `GDPR deletion request logged. Operations suspended pending Legal review.`,
                          caseId: `legal-${crypto.randomUUID().slice(0, 8)}`,
                        };
                      }

                      return mockResult;
                    },
                  );
                },
              );

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      createToolSuccess(data, {
                        requestId: reqId,
                        toolName: cap.name,
                        toolVersion: "1.0.0",
                        durationMs,
                        riskLevel: cap.riskLevel || "low",
                      }),
                      null,
                      2,
                    ),
                  },
                ],
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
              mcpToolFailuresCounter.add(1);
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      createToolFailure(err.message, "INTERNAL_ERROR", {
                        requestId: reqId,
                        toolName: cap.name,
                        toolVersion: "1.0.0",
                        durationMs: 0,
                      }),
                      null,
                      2,
                    ),
                  },
                ],
              };
            }
          },
        );
      }
    }
  }
}
