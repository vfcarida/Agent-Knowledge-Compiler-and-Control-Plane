#!/usr/bin/env node

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { AKCPProfileServer } from "./server.js";



// Read the previously compiled AgentKnowledgeIR
const irPath = path.resolve(process.cwd(), "dist/knowledge-ir.json");
if (!fs.existsSync(irPath)) {
  console.error(`[AKCP Profile Server - SSE] Missing compiled IR at ${irPath}.`);
  console.error(`Run 'akcp compile' first to generate the knowledge graph.`);
  process.exit(1);
}

const irStr = fs.readFileSync(irPath, "utf-8");
const ir = JSON.parse(irStr);

// Instantiate the AKCP Profile Server logic
const profileServer = new AKCPProfileServer(ir, { policies: ir.policies || {} }, "mcp-sse-client");
const mcp = profileServer.getServerInstance();

const app = express();
app.use(cors());

// Mock JWT Auth Middleware from Phase 5 (Enterprise Gateway Security)
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization Bearer token" });
    return;
  }

  const token = authHeader.substring(7);
  // For MVP: Accept admin@corp.com directly as the token payload.
  // In production, this would verify a real JWT signature against an IdP (e.g., Auth0).
  if (token !== "admin@corp.com" && !token.includes("@")) {
    res.status(403).json({ error: "Unauthorized Identity" });
    return;
  }

  // We consider them authenticated
  (req as any).user = { identity: token };
  next();
};

let globalTransport: SSEServerTransport | null = null;

// SSE connection endpoint
app.get("/sse", requireAuth, async (req, res) => {
  console.log(`[SSE] New connection from ${req.ip} (User: ${(req as any).user.identity})`);
  globalTransport = new SSEServerTransport("/message", res);
  
  await mcp.connect(globalTransport);
  
  req.on('close', () => {
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
  } catch (err: any) {
    console.error("[SSE] Error handling message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.listen(PORT, () => {
  console.log(`[AKCP Profile Server - SSE] Listening on port ${PORT}`);
  console.log(`[AKCP Profile Server - SSE] Endpoint: http://localhost:${PORT}/sse`);
  console.log(`[AKCP Profile Server - SSE] Identity Authorization Required (Bearer Token)`);
});
