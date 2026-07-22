#!/usr/bin/env node

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { AKCPProfileServer } from "./server.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

// Read the previously compiled AgentKnowledgeIR
const irPath = path.resolve(process.cwd(), "dist/agent-knowledge-ir.json");
if (!fs.existsSync(irPath)) {
  console.error(
    `[AKCP Profile Server - SSE] Missing compiled IR at ${irPath}.`,
  );
  console.error(`Run 'akcp compile' first to generate the knowledge graph.`);
  process.exit(1);
}

const irStr = fs.readFileSync(irPath, "utf-8");
const ir = JSON.parse(irStr);

// Instantiate the AKCP Profile Server logic
const profileServer = new AKCPProfileServer(
  ir,
  { policies: ir.policies || {} },
  "mcp-sse-client",
);
const mcp = profileServer.getServerInstance();

const app = express();
app.use(cors());

// JWT Auth Middleware
const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const jwtSecret = process.env["AKCP_JWT_SECRET"];
  const jwksUri = process.env["AKCP_JWKS_URI"];

  if (!jwtSecret && !jwksUri) {
    // If no token verification is configured, allow anonymous access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { identity: "anonymous-agent" };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or invalid Authorization Bearer token" });
    return;
  }

  const token = authHeader.substring(7);
  if (!token) {
    res
      .status(401)
      .json({ error: "Missing or invalid Authorization Bearer token" });
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
    (req as any).user = {
      identity: payload?.sub || payload?.email || "authenticated-agent",
    };
    next();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    res
      .status(401)
      .json({ error: `Unauthorized: Invalid token (${err.message})` });
    return;
  }
};

let globalTransport: SSEServerTransport | null = null;

// SSE connection endpoint
app.get("/sse", requireAuth, async (req, res) => {
  console.warn(
    `[SSE] New connection from ${req.ip} (User: ${(req as express.Request & { user?: { identity?: string } }).user?.identity ?? "anonymous"})`,
  );
  globalTransport = new SSEServerTransport("/message", res);

  await mcp.connect(globalTransport);

  req.on("close", () => {
    // eslint-disable-next-line no-console
    console.log(`[SSE] Connection closed for ${req.ip}`);
    globalTransport = null;
  });
});

// Message endpoint to receive JSON-RPC messages from the client
app.post("/message", requireAuth, express.json(), async (req, res) => {
  if (!globalTransport) {
    res.status(500).json({ error: "No active SSE connection found." });
    return;
  }
  try {
    await globalTransport.handlePostMessage(req, res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[SSE] Error handling message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[AKCP Profile Server - SSE] Listening on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
    `[AKCP Profile Server - SSE] Endpoint: http://localhost:${PORT}/sse`,
  );
  if (process.env["AKCP_JWT_SECRET"] || process.env["AKCP_JWKS_URI"]) {
    console.warn(
      `[AKCP Profile Server - SSE] Enterprise Auth enabled (JWT Validation active).`,
    );
  } else {
    console.warn(
      `[AKCP Profile Server - SSE] WARNING: No AKCP_JWT_SECRET or AKCP_JWKS_URI set. Running without authentication.`,
    );
  }
});
