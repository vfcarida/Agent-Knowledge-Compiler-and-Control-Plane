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
} from "@akcp/core";
import { AKCPProfileServer } from "./server.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface ProfileHttpAppOptions {
  ir?: AgentKnowledgeIR | (() => AgentKnowledgeIR | null | undefined);
  isReady?: boolean | (() => boolean);
  jwtSecret?: string;
  jwksUri?: string;
  allowInsecureDev?: boolean;
}

/**
 * Creates and configures the Express application for the MCP Profile Server.
 * Health check endpoints (/healthz, /readyz) are mounted before authentication middleware.
 */
export function createProfileHttpApp(
  options: ProfileHttpAppOptions = {},
): express.Express {
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
      next();
    } catch (err: any) {
      res
        .status(401)
        .json({ error: `Unauthorized: Invalid token (${err.message})` });
      return;
    }
  });

  // 3. SSE Transport & MCP Endpoints
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

    const app = createProfileHttpApp({
      ir,
      jwtSecret,
      jwksUri,
      allowInsecureDev,
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
