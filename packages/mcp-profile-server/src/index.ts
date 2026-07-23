/**
 * @module index
 * @description Entrypoint for the dynamic MCP Profile Server.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { startTelemetry, type AgentKnowledgeIR } from "@akcp/core";
import { AKCPProfileServer } from "./server.js";
import fs from "node:fs";

async function main() {
  try {
    // Start telemetry NodeSDK
    startTelemetry();

    const contextPackEnv = process.env["AKCP_IR_PATH"];
    if (!contextPackEnv) {
      throw new Error(
        "[AKCP Profile Server] AKCP_IR_PATH environment variable is required.",
      );
    }

    const contextPackPath = path.resolve(contextPackEnv);

    console.error(
      `[AKCP Profile Server] Initializing with Context Pack at: ${contextPackPath}`,
    );

    if (!fs.existsSync(contextPackPath)) {
      throw new Error(
        `[AKCP Profile Server] Context pack not found at ${contextPackPath}`,
      );
    }

    const irContent = fs.readFileSync(contextPackPath, "utf-8");
    const ir: AgentKnowledgeIR = JSON.parse(irContent);

    // Provide the dynamic IR to the new server
    const mcpProfileServer = new AKCPProfileServer(ir, {
      policies: ir.policies || {},
    });
    const serverInstance = mcpProfileServer.getServerInstance();

    const transport = new StdioServerTransport();
    await serverInstance.connect(transport);

    console.error(
      "[AKCP Profile Server] Successfully connected via stdio transport.",
    );
  } catch (error) {
    console.error("[AKCP Profile Server] Fatal startup error:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[AKCP Profile Server] Unhandled rejection:", err);
  process.exit(1);
});
