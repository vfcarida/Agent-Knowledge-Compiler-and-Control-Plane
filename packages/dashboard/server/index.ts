import express from "express";
import cors from "cors";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Auth Middleware: Decodes simulated Bearer JWT tokens
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    // In a real app, verify JWT here. For MVP, we trust the token string as the identity.
    (req as any).user = { identity: token };
  } else {
    (req as any).user = { identity: "anonymous" };
  }
  next();
};

app.use(authMiddleware);

const PORT = process.env.PORT || 3001;

// Initialize MCP Clients
let profileClient: Client | null = null;
let automationClient: Client | null = null;

async function startMCPClients() {
  try {
    const profileScript = path.resolve(
      __dirname,
      "../../mcp-profile-server/dist/index.js",
    );
    const automationScript = path.resolve(
      __dirname,
      "../../mcp-automation-server/dist/index.js",
    );

    const env = {
      ...process.env,
      AKCP_IR_PATH: process.env.AKCP_IR_PATH || path.resolve(__dirname, "../../../dist/agent-knowledge-ir.json"),
      AKCP_BUNDLE_PATH: process.env.AKCP_BUNDLE_PATH || path.resolve(__dirname, "../../../.okf")
    };

    console.log(`[BFF] Starting Profile Server: ${profileScript}`);
    const profileTransport = new StdioClientTransport({
      command: "node",
      args: [profileScript],
      env,
    });

    profileClient = new Client(
      { name: "dashboard-bff-profile", version: "1.0.0" },
      { capabilities: {} },
    );
    await profileClient.connect(profileTransport);
    console.log("[BFF] Profile Server connected");

    console.log(`[BFF] Starting Automation Server: ${automationScript}`);
    const automationTransport = new StdioClientTransport({
      command: "node",
      args: [automationScript],
      env,
    });

    automationClient = new Client(
      { name: "dashboard-bff-automation", version: "1.0.0" },
      { capabilities: {} },
    );
    await automationClient.connect(automationTransport);
    console.log("[BFF] Automation Server connected");
  } catch (error) {
    console.error("[BFF] Error starting MCP clients:", error);
  }
}

// Fetch Graph
app.get("/api/manifest/graph", async (req: Request, res: Response) => {
  try {
    const graphPath = path.resolve(
      process.cwd(),
      "../../dist/knowledge-graph.json",
    );
    if (!fs.existsSync(graphPath)) {
      return res.status(404).json({ error: "Graph not found" });
    }
    const graphData = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
    res.json(graphData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// REST Endpoints
app.post("/api/profile/validate", async (req, res) => {
  if (!profileClient)
    return res.status(503).json({ error: "Profile server not ready" });
  try {
    const result = await profileClient.callTool({
      name: "validate_bundle",
      arguments: {},
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/profile/migrate", async (req, res) => {
  if (!profileClient)
    return res.status(503).json({ error: "Profile server not ready" });
  const { write } = req.body;
  try {
    const result = await profileClient.callTool({
      name: "migrate_bundle",
      arguments: { write },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/automation/approvals", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  try {
    const result = await automationClient.callTool({
      name: "list_pending_approvals",
      arguments: {},
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/approve", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  const { approvalToken, jobUrl, dryRun, approverIdentity: providedIdentity } = req.body;
  const approverIdentity = providedIdentity || (req as any).user?.identity;
  try {
    const result = await automationClient.callTool({
      name: "confirm_application_submission",
      arguments: { approvalToken, jobUrl, dryRun, approverIdentity },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/approve-token", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  const { approvalToken, approverIdentity: providedIdentity } = req.body;
  const approverIdentity = providedIdentity || (req as any).user?.identity;
  try {
    const result = await automationClient.callTool({
      name: "approve_pending_token",
      arguments: { approvalToken, approverIdentity },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// For testing purposes
app.post("/api/automation/prepare", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  const { jobUrl } = req.body;
  try {
    const result = await automationClient.callTool({
      name: "prepare_application",
      arguments: { jobUrl },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/revoke", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  const { approvalToken, approverIdentity } = req.body;
  try {
    const result = await automationClient.callTool({
      name: "revoke_approval",
      arguments: { approvalToken, approverIdentity },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/audit/logs", async (req, res) => {
  if (!automationClient)
    return res.status(503).json({ error: "Automation server not ready" });
  
  const limit = parseInt(req.query.limit as string) || 100;
  try {
    const result = await automationClient.callTool({
      name: "list_audit_logs",
      arguments: { limit },
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import fs from "node:fs";

app.get("/api/evals/report", (req, res) => {
  try {
    const reportPath = path.resolve(
      __dirname,
      "../../../reports/benchmark-report.json",
    );
    if (fs.existsSync(reportPath)) {
      const data = fs.readFileSync(reportPath, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: "Report not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/manifest", (req, res) => {
  try {
    const manifestPath = path.resolve(
      __dirname,
      "../../../dist/akcp-manifest.json",
    );
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res
        .status(404)
        .json({ error: "Manifest not found. Run a compilation first." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp/tools", (req, res) => {
  try {
    const irPath = path.resolve(
      __dirname,
      "../../../examples/domains/it-operations/dist/agent-knowledge-ir.json",
    );
    // Note: For MVP we fallback to IT operations or Career bundle just to display the tool capabilities
    const fallbackPath = path.resolve(
      __dirname,
      "../../../examples/domains/career/dist/agent-knowledge-ir.json",
    );
    
    let targetPath = fs.existsSync(irPath) ? irPath : fallbackPath;

    if (fs.existsSync(targetPath)) {
      const data = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      res.json({ tools: data.capabilities || [] });
    } else {
      res.status(404).json({ error: "No compiled IR found. Compile a domain first." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`[BFF] Express server running on port ${PORT}`);
  await startMCPClients();
});
