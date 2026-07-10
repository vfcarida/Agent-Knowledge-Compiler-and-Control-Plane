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
import { AKCPAutomationServer } from './server.js';
import fs from 'node:fs';

async function main() {
  try {
    // Start telemetry NodeSDK
    startTelemetry();

    const bundleRootEnv = process.env['AKCP_BUNDLE_PATH'] || process.env['OCF_BUNDLE_PATH'];
    if (process.env['OCF_BUNDLE_PATH'] && !process.env['AKCP_BUNDLE_PATH']) {
      console.warn('[WARNING] OCF_BUNDLE_PATH is deprecated. Please use AKCP_BUNDLE_PATH.');
    }
    const bundleRoot = path.resolve(bundleRootEnv || './.okf');
    
    const irPathEnv = process.env['AKCP_IR_PATH'] || process.env['OCF_IR_PATH'];
    if (process.env['OCF_IR_PATH'] && !process.env['AKCP_IR_PATH']) {
      console.warn('[WARNING] OCF_IR_PATH is deprecated. Please use AKCP_IR_PATH.');
    }
    const irPath = path.resolve(irPathEnv || './dist/knowledge-ir.json');

    console.error(`[AKCP Automation Server] Initializing bundle at: ${bundleRoot}`);

    const fsAdapter = new FileSystemAdapter();
    const fmParser = new FrontmatterParser();

    await fsAdapter.mkdir(bundleRoot);
    let repo: any = new OKFFileRepository(fsAdapter, fmParser, bundleRoot);
    
    if (fs.existsSync(irPath)) {
      console.error(`[AKCP Automation Server] Found Knowledge IR at ${irPath}. Enabling in-memory cache.`);
      try {
        const irContent = fs.readFileSync(irPath, 'utf-8');
        const ir = JSON.parse(irContent);
        repo = new OKFCachedRepository(repo, ir);
      } catch (err: any) {
        console.error(`[AKCP Automation Server] Failed to load IR, falling back to disk-only: ${err.message}`);
      }
    } else {
      console.error(`[AKCP Automation Server] No Knowledge IR found. Running in disk-only mode.`);
    }

    const indexService = new IndexService(fsAdapter, fmParser, bundleRoot);
    const logService = new LogService(fsAdapter, path.join(bundleRoot, 'log.md'));
    const docService = new OKFDocumentService(repo, indexService, logService, bundleRoot);

    const mcpAutomationServer = new AKCPAutomationServer(docService);
    const serverInstance = mcpAutomationServer.getServerInstance();

    const transport = new StdioServerTransport();
    await serverInstance.connect(transport);

    console.error('[AKCP Automation Server] Successfully connected via stdio transport.');
  } catch (error) {
    console.error('[AKCP Automation Server] Fatal startup error:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[AKCP Automation Server] Unhandled rejection:', err);
  process.exit(1);
});
