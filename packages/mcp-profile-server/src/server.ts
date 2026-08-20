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
  extractGatewayPolicies,
} from "@akcp/core";

export const UNTRUSTED_CONTENT_BOUNDARY_BEGIN =
  "[BEGIN UNTRUSTED DOCUMENT CONTENT]";
export const UNTRUSTED_CONTENT_BOUNDARY_END =
  "[END UNTRUSTED DOCUMENT CONTENT]";

export interface ProfileServerOptions {
  /**
   * Whether to wrap resource body content with untrusted boundary markers:
   * [BEGIN UNTRUSTED DOCUMENT CONTENT] ... [END UNTRUSTED DOCUMENT CONTENT]
   * Defaults to true.
   */
  enableContentBoundaries?: boolean;

  /**
   * Whether to perform an opt-in WAF scan on resource content to detect and flag
   * potential prompt injection patterns in response metadata without modifying content.
   * Defaults to false.
   */
  enableWafScan?: boolean;

  /**
   * Optional custom security gateway implementation for WAF scanning and tool checks.
   * Defaults to LakeraGateway.
   */
  securityGateway?: ISecurityGateway;
}

export class AKCPProfileServer {
  private readonly server: McpServer;
  private readonly gateway: MCPGateway;
  private readonly ir: AgentKnowledgeIR;
  private readonly agentIdentity: string;
  private readonly securityGateway: ISecurityGateway;
  private readonly options: Required<
    Omit<ProfileServerOptions, "securityGateway">
  >;

  constructor(
    ir: AgentKnowledgeIR,
    gatewayConfig?: Partial<GatewayConfig>,
    agentIdentity: string = "mcp-client",
    options?: ProfileServerOptions,
  ) {
    this.ir = ir;
    const extractedPolicies = extractGatewayPolicies(ir);
    const resolvedConfig: GatewayConfig = {
      policies: gatewayConfig?.policies ?? extractedPolicies,
      defaultPolicy:
        gatewayConfig?.defaultPolicy ?? extractedPolicies["default"],
      ...gatewayConfig,
    };
    this.gateway = new MCPGateway(resolvedConfig);
    this.agentIdentity = agentIdentity;

    const envContentBoundaries =
      process.env["AKCP_ENABLE_CONTENT_BOUNDARIES"] !== "false";
    const envWafScan = process.env["AKCP_ENABLE_RESOURCE_WAF"] === "true";

    this.options = {
      enableContentBoundaries:
        options?.enableContentBoundaries ?? envContentBoundaries,
      enableWafScan: options?.enableWafScan ?? envWafScan,
    };
    this.securityGateway = options?.securityGateway ?? new LakeraGateway();

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

  getOptions(): Required<Omit<ProfileServerOptions, "securityGateway">> {
    return this.options;
  }

  getSecurityGateway(): ISecurityGateway {
    return this.securityGateway;
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

          let bodyContent = concept.body || "";
          if (this.options.enableContentBoundaries) {
            bodyContent = `${UNTRUSTED_CONTENT_BOUNDARY_BEGIN}\n${bodyContent}\n${UNTRUSTED_CONTENT_BOUNDARY_END}`;
          }

          const metadata: Record<string, unknown> = {
            contentType: "untrusted-document",
            injectionRisk: "possible",
            trustLevel: "untrusted",
            boundaryMarkers: this.options.enableContentBoundaries,
          };

          if (this.options.enableWafScan) {
            const scanResult = await this.securityGateway.checkPrompt(
              concept.body || "",
            );
            metadata.wafScan = {
              scanned: true,
              flagged: scanResult.flagged,
              reason: scanResult.reason,
              provider: scanResult.provider,
            };
            if (scanResult.flagged) {
              metadata.injectionRisk = "high";
              metadata.suspicious = true;
            }
          }

          return {
            _meta: metadata,
            contents: [
              {
                uri,
                mimeType: "text/markdown",
                text: `---\n${JSON.stringify(concept.frontmatter, null, 2)}\n---${summaryStr}\n\n${bodyContent}`,
                _meta: metadata,
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
          let bodyContent = concept.body || "";
          if (this.options.enableContentBoundaries) {
            bodyContent = `${UNTRUSTED_CONTENT_BOUNDARY_BEGIN}\n${bodyContent}\n${UNTRUSTED_CONTENT_BOUNDARY_END}`;
          }
          fullText = `---\n${JSON.stringify(concept.frontmatter, null, 2)}\n---\n\n${bodyContent}`;
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
        const rawCap = cap as any;
        const schema =
          cap.inputsSchema || rawCap.inputSchema || rawCap.parameters || {};

        // Convert basic JSON schema to Zod schema dynamically
        const zodShape: Record<string, z.ZodTypeAny> = {};

        if (schema.properties) {
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

            // Real HITL gating for requiresApproval tools happens inside
            // this.gateway.execute() below, via the policy engine's
            // "require_approval" obligation (see capabilities/gateway.ts) — not
            // here. This used to be a console.warn-only no-op that gave the false
            // impression of a check without actually blocking anything.

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
                  riskLevel: cap.riskLevel,
                  agentId: this.agentIdentity,
                  payload: args,
                },
                async () => {
                  return await withToolTracing(
                    cap.name,
                    "1.0.0",
                    reqId,
                    async () => {
                      // AKCPProfileServer is read-only by design (ADR-002) — it has no
                      // real backend to execute side-effecting capabilities against.
                      // This used to fabricate plausible-looking "success"/"pending"
                      // results (e.g. a fake transactionId for issue_refund) regardless
                      // of policy/approval outcome, which a caller could easily mistake
                      // for a real result. Any non-read-only capability now gets an
                      // explicit not_implemented status instead — real side-effecting
                      // actions belong in mcp-automation-server, gated by its HITL flow.
                      const isReadOnly =
                        !cap.sideEffects ||
                        cap.sideEffects === "none" ||
                        cap.sideEffects === "external-read";

                      if (!isReadOnly) {
                        return {
                          status: "not_implemented",
                          message: `'${cap.name}' has side effect '${cap.sideEffects}' — the read-only profile server does not execute it. Use mcp-automation-server for side-effecting actions.`,
                        };
                      }

                      return {
                        status: "ok",
                        message: `Tool ${cap.name} executed (read-only).`,
                        args,
                      };
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
