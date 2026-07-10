/**
 * @module index
 * @description Entrypoint for the MCP Automation Server.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import {
  FileSystemAdapter,
  FrontmatterParser,
  OKFFileRepository,
  OKFCachedRepository,
  IndexService,
  LogService,
  OKFDocumentService,
  startTelemetry,
} from '@ocf/core';
import { OCFMcpAutomationServer } from './server.js';
import fs from 'node:fs';

async function main() {
  try {
    // Start telemetry NodeSDK
    startTelemetry();

    const bundleRootEnv = process.env['OCF_BUNDLE_PATH'] || './.okf';
    const bundleRoot = path.resolve(bundleRootEnv);
    
    const irPathEnv = process.env['OCF_IR_PATH'] || './dist/knowledge-ir.json';
    const irPath = path.resolve(irPathEnv);

    console.error(`[OCF Automation Server] Initializing bundle at: ${bundleRoot}`);

    const fsAdapter = new FileSystemAdapter();
    const fmParser = new FrontmatterParser();

    await fsAdapter.mkdir(bundleRoot);
    let repo: any = new OKFFileRepository(fsAdapter, fmParser, bundleRoot);
    
    if (fs.existsSync(irPath)) {
      console.error(`[OCF Automation Server] Found Knowledge IR at ${irPath}. Enabling in-memory cache.`);
      try {
        const irContent = fs.readFileSync(irPath, 'utf-8');
        const ir = JSON.parse(irContent);
        repo = new OKFCachedRepository(repo, ir);
      } catch (err: any) {
        console.error(`[OCF Automation Server] Failed to load IR, falling back to disk-only: ${err.message}`);
      }
    } else {
      console.error(`[OCF Automation Server] No Knowledge IR found. Running in disk-only mode.`);
    }

    const indexService = new IndexService(fsAdapter, fmParser, bundleRoot);
    const logService = new LogService(fsAdapter, path.join(bundleRoot, 'log.md'));
    const docService = new OKFDocumentService(repo, indexService, logService, bundleRoot);

    const mcpAutomationServer = new OCFMcpAutomationServer(docService);
    const serverInstance = mcpAutomationServer.getServerInstance();

    const transport = new StdioServerTransport();
    await serverInstance.connect(transport);

    console.error('[OCF Automation Server] Successfully connected via stdio transport.');
  } catch (error) {
    console.error('[OCF Automation Server] Fatal startup error:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[OCF Automation Server] Unhandled rejection:', err);
  process.exit(1);
});
