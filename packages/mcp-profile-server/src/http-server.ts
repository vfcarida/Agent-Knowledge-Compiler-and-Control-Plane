/**
 * @module http-server
 * @description Entrypoint and Express application for the MCP Profile Server over HTTP/SSE.
 */

import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  startTelemetry,
  type AgentKnowledgeIR,
  extractGatewayPolicies,
  verifyAttestationSignature,
  type SignedAttestation,
} from "@akcp/core";
import {
  AKCPProfileServer,
  UNTRUSTED_CONTENT_BOUNDARY_BEGIN,
  UNTRUSTED_CONTENT_BOUNDARY_END,
} from "./server.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface ProfileHttpAppOptions {
  ir?: AgentKnowledgeIR | (() => AgentKnowledgeIR | null | undefined);
  isReady?: boolean | (() => boolean);
  jwtSecret?: string;
  jwksUri?: string;
  allowInsecureDev?: boolean;
  signedAttestation?: SignedAttestation;
  publicKeyPem?: string;
}

/**
 * Creates and configures the Express application for the MCP Profile Server.
 * Health check endpoints (/healthz, /readyz) are mounted before authentication middleware.
 */
export function createProfileHttpApp(
  options: ProfileHttpAppOptions = {},
): express.Express {
  if (options.signedAttestation && options.publicKeyPem) {
    const validSig = verifyAttestationSignature(
      options.signedAttestation,
      options.publicKeyPem,
    );
    if (!validSig) {
      throw new Error(
        "[AKCP Profile Server] Provenance attestation signature verification failed.",
      );
    }
  }

  const app = express();
  app.use(cors());

  // 1. Health & Readiness Endpoints (NO AUTH REQUIRED)
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/readyz", (_req, res) => {
    let ir: AgentKnowledgeIR | null | undefined;
    if (typeof options.ir === "function") {
      ir = options.ir();
    } else {
      ir = options.ir;
    }

    let isReady: boolean;
    if (typeof options.isReady === "function") {
      isReady = options.isReady();
    } else if (typeof options.isReady === "boolean") {
      isReady = options.isReady;
    } else {
      isReady = ir != null;
    }

    if (isReady) {
      res.status(200).json({ status: "ready", ir_loaded: true });
    } else {
      res.status(503).json({ status: "not_ready", ir_loaded: false });
    }
  });

  // 2. JWT Auth Middleware
  const jwtSecret = options.jwtSecret ?? process.env["AKCP_JWT_SECRET"];
  const jwksUri = options.jwksUri ?? process.env["AKCP_JWKS_URI"];
  const allowInsecureDev =
    options.allowInsecureDev ??
    process.env["AKCP_ALLOW_INSECURE_DEV"] === "true";

  if (!jwtSecret && !jwksUri && !allowInsecureDev) {
    // In production/default mode, fail closed on protected routes if auth isn't configured
    app.use((_req, res, next) => {
      if (process.env["NODE_ENV"] === "test") {
        return next();
      }
      res.status(500).json({
        error:
          "Authentication not configured. Set AKCP_JWT_SECRET or AKCP_JWKS_URI, or AKCP_ALLOW_INSECURE_DEV=true for local dev.",
      });
    });
  }

  app.use(async (req, res, next) => {
    if (!jwtSecret && !jwksUri) {
      // Unauthenticated / dev mode
      (req as any).agentIdentity = "anonymous-agent";
      (req as any).agentScopes = ["*"];
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Unauthorized: Missing or invalid Bearer token" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
      return;
    }

    try {
      let payload;
      if (jwksUri) {
        const JWKS = createRemoteJWKSet(new URL(jwksUri));
        const result = await jwtVerify(token, JWKS);
        payload = result.payload;
      } else if (jwtSecret) {
        const secret = new TextEncoder().encode(jwtSecret);
        const result = await jwtVerify(token, secret);
        payload = result.payload;
      }

      (req as any).agentIdentity =
        payload?.sub || payload?.email || "authenticated-agent";
      const scopes: string[] = [];
      if (typeof payload?.scope === "string") {
        scopes.push(...payload.scope.split(/\s+/).filter(Boolean));
      }
      if (Array.isArray(payload?.scopes)) {
        scopes.push(...(payload.scopes as string[]));
      }
      (req as any).agentScopes = scopes.length > 0 ? scopes : ["*"];
      next();
    } catch (err: any) {
      res
        .status(401)
        .json({ error: `Unauthorized: Invalid token (${err.message})` });
      return;
    }
  });

  // 3. Streamable HTTP JSON-RPC 2.0 Endpoint (POST /mcp)
  app.post("/mcp", express.json(), async (req, res) => {
    const resolvedIr =
      typeof options.ir === "function" ? options.ir() : options.ir;

    if (!resolvedIr) {
      res.status(503).json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32000, message: "AgentKnowledgeIR is not loaded" },
      });
      return;
    }

    const rpcReq = req.body || {};
    const { id = null, method, params = {} } = rpcReq;
    const concepts = resolvedIr.concepts ?? resolvedIr.items ?? [];
    const bundleId = resolvedIr.bundleId ?? resolvedIr.bundleName ?? "default";

    if (method === "initialize") {
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: {
            name: "akcp-profile-server",
            version: "1.0.0",
          },
          agentIdentity: (req as any).agentIdentity,
        },
      });
      return;
    }

    if (method === "resources/list") {
      const resources = concepts.map((c: any) => {
        const cid = c.conceptId || c.id;
        return {
          uri: `knowledge://${bundleId}/${cid}`,
          name: cid,
          mimeType: "text/markdown",
          description: `Knowledge asset: ${cid} (Type: ${c.type})`,
        };
      });
      res.status(200).json({ jsonrpc: "2.0", id, result: { resources } });
      return;
    }

    if (method === "resources/read") {
      const uri: string = params.uri || "";
      const target = concepts.find((c: any) => {
        const cid = c.conceptId || c.id;
        return (
          uri === `knowledge://${bundleId}/${cid}` || uri.endsWith(`/${cid}`)
        );
      });
      if (!target) {
        res.status(404).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32002, message: `Resource not found: ${uri}` },
        });
        return;
      }
      const bodyText = `${UNTRUSTED_CONTENT_BOUNDARY_BEGIN}\n${target.body || ""}\n${UNTRUSTED_CONTENT_BOUNDARY_END}`;
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: bodyText,
            },
          ],
        },
      });
      return;
    }

    if (method === "tools/list") {
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "read_document_chunk",
              description:
                "Read a paginated chunk of a specific knowledge concept to avoid context window collapse.",
            },
          ],
        },
      });
      return;
    }

    if (method === "tools/call") {
      const toolName = params.name;
      const toolArgs = params.arguments || {};
      if (toolName === "read_document_chunk") {
        const conceptId = toolArgs.conceptId;
        const offset = Number(toolArgs.offset ?? 0);
        const limit = Number(toolArgs.limit ?? 4000);
        const concept = concepts.find(
          (c: any) => (c.conceptId || c.id) === conceptId,
        );
        if (!concept) {
          res.status(200).json({
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Error: Concept ${conceptId} not found.`,
                },
              ],
            },
          });
          return;
        }
        const chunk = (concept.body || "").slice(offset, offset + limit);
        res.status(200).json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  conceptId,
                  offset,
                  limit,
                  chunk,
                }),
              },
            ],
          },
        });
        return;
      }

      res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${String(toolName)}` },
      });
      return;
    }

    res.status(400).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${String(method)}` },
    });
  });

  // 4. SSE Transport & MCP Endpoints
  const transports = new Map<string, SSEServerTransport>();

  app.get("/mcp/sse", async (req, res) => {
    const transport = new SSEServerTransport("/mcp/messages", res);
    transports.set(transport.sessionId, transport);

    console.log(
      `[AKCP Profile Server] New SSE connection established (session ${transport.sessionId})`,
    );
    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const agentIdentity = (req as any).agentIdentity || "anonymous-agent";

    const resolvedIr =
      typeof options.ir === "function" ? options.ir() : options.ir;

    if (!resolvedIr) {
      res.status(503).json({ error: "AgentKnowledgeIR is not loaded" });
      return;
    }

    const mcpProfileServer = new AKCPProfileServer(
      resolvedIr,
      { policies: extractGatewayPolicies(resolvedIr) },
      agentIdentity,
    );
    await mcpProfileServer.getServerInstance().connect(transport);
  });

  app.post("/mcp/messages", express.json(), async (req, res) => {
    const sessionId = req.query["sessionId"] as string | undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res
        .status(400)
        .json({ error: "No active SSE connection for this session" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  return app;
}

async function main() {
  try {
    startTelemetry();

    const contextPackEnv = process.env["AKCP_IR_PATH"];
    if (!contextPackEnv) {
      throw new Error(
        "[AKCP Profile Server] AKCP_IR_PATH environment variable is required.",
      );
    }

    const contextPackPath = path.resolve(contextPackEnv);
    if (!fs.existsSync(contextPackPath)) {
      throw new Error(
        `[AKCP Profile Server] Context pack not found at ${contextPackPath}`,
      );
    }

    const irContent = fs.readFileSync(contextPackPath, "utf-8");
    const ir: AgentKnowledgeIR = JSON.parse(irContent);

    const jwtSecret = process.env["AKCP_JWT_SECRET"];
    const jwksUri = process.env["AKCP_JWKS_URI"];
    const allowInsecureDev = process.env["AKCP_ALLOW_INSECURE_DEV"] === "true";

    if (!jwtSecret && !jwksUri && !allowInsecureDev) {
      throw new Error(
        "[AKCP Profile Server] Refusing to start without authentication: neither " +
          "AKCP_JWT_SECRET nor AKCP_JWKS_URI is set. This server can expose read " +
          "access to compiled knowledge over HTTP, so it fails closed by default. " +
          "Set one of those two, or set AKCP_ALLOW_INSECURE_DEV=true to explicitly " +
          "opt into unauthenticated local development mode.",
      );
    }

    let signedAttestation: SignedAttestation | undefined;
    let publicKeyPem: string | undefined;
    if (
      process.env["AKCP_ATTESTATION_PATH"] &&
      process.env["AKCP_PUBLIC_KEY_PATH"]
    ) {
      signedAttestation = JSON.parse(
        fs.readFileSync(
          path.resolve(process.env["AKCP_ATTESTATION_PATH"]),
          "utf-8",
        ),
      );
      publicKeyPem = fs.readFileSync(
        path.resolve(process.env["AKCP_PUBLIC_KEY_PATH"]),
        "utf-8",
      );
    }

    const app = createProfileHttpApp({
      ir,
      jwtSecret,
      jwksUri,
      allowInsecureDev,
      signedAttestation,
      publicKeyPem,
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(
        `[AKCP Profile Server] HTTP/SSE Server listening on port ${PORT}`,
      );
      if (jwtSecret || jwksUri) {
        console.log(
          `[AKCP Profile Server] Enterprise Auth enabled (JWT Validation active).`,
        );
      } else {
        console.warn(
          `[AKCP Profile Server] WARNING: No AKCP_JWT_SECRET or AKCP_JWKS_URI set. Running without authentication.`,
        );
      }
    });
  } catch (error) {
    console.error("[AKCP Profile Server] Fatal startup error:", error);
    process.exit(1);
  }
}

// Only invoke main when run directly
if (process.argv[1] && process.argv[1].endsWith("http-server.ts")) {
  main().catch((err) => {
    console.error("[AKCP Profile Server] Unhandled rejection:", err);
    process.exit(1);
  });
}
