/**
 * @module http-server
 * @description Entrypoint for the dynamic MCP Profile Server over HTTP/SSE with Bearer Auth.
 */

import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { startTelemetry, type AgentKnowledgeIR } from "@akcp/core";
import { AKCPProfileServer } from "./server.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

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

    const app = express();
    app.use(cors());

    // JWT Auth Middleware
    const jwtSecret = process.env["AKCP_JWT_SECRET"];
    const jwksUri = process.env["AKCP_JWKS_URI"];

    app.use(async (req, res, next) => {
      if (!jwtSecret && !jwksUri) {
        // If no token verification is configured, allow anonymous access for MVP backwards-compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Use sub or email as identity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).agentIdentity =
          payload?.sub || payload?.email || "authenticated-agent";
        next();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        res
          .status(401)
          .json({ error: `Unauthorized: Invalid token (${err.message})` });
        return;
      }
    });

    let transport: SSEServerTransport | null = null;

    app.get("/mcp/sse", async (req, res) => {
      // eslint-disable-next-line no-console
      console.log("[AKCP Profile Server] New SSE connection established");
      transport = new SSEServerTransport("/mcp/messages", res);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentIdentity = (req as any).agentIdentity || "anonymous-agent";

      const mcpProfileServer = new AKCPProfileServer(
        ir,
        { policies: ir.policies || {} },
        agentIdentity,
      );
      await mcpProfileServer.getServerInstance().connect(transport);
    });

    app.post("/mcp/messages", express.json(), async (req, res) => {
      if (!transport) {
        res.status(400).json({ error: "SSE connection not established" });
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(
        `[AKCP Profile Server] HTTP/SSE Server listening on port ${PORT}`,
      );
      if (jwtSecret || jwksUri) {
        // eslint-disable-next-line no-console
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

main().catch((err) => {
  console.error("[AKCP Profile Server] Unhandled rejection:", err);
  process.exit(1);
});
