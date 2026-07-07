/**
 * @module index
 * @description Entrypoint for the Open Career Format MCP Server.
 *
 * Connects the server via stdio transport to any MCP host.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import {
  FileSystemAdapter,
  FrontmatterParser,
  OKFFileRepository,
  IndexService,
  LogService,
  OKFDocumentService,
} from '@ocf/core';
import { OCFMcpServer } from './server.js';

async function main() {
  try {
    // 1. Resolve path to target OKF knowledge bundle
    // Defaults to ".okf" in current working directory if not supplied.
    const bundleRootEnv = process.env['OCF_BUNDLE_PATH'] || './.okf';
    const bundleRoot = path.resolve(bundleRootEnv);

    console.error(`[OCF MCP] Initializing career bundle at: ${bundleRoot}`);

    // 2. Initialize Layer 1 (OKF Core Engine)
    const fsAdapter = new FileSystemAdapter();
    const fmParser = new FrontmatterParser();

    // Create bundle directory structure if missing
    await fsAdapter.mkdir(bundleRoot);
    await fsAdapter.mkdir(path.join(bundleRoot, 'skills'));
    await fsAdapter.mkdir(path.join(bundleRoot, 'experiences'));
    await fsAdapter.mkdir(path.join(bundleRoot, 'applications'));
    await fsAdapter.mkdir(path.join(bundleRoot, 'preferences'));

    const repo = new OKFFileRepository(fsAdapter, fmParser, bundleRoot);

    const indexService = new IndexService(fsAdapter, fmParser, bundleRoot);
    const logService = new LogService(fsAdapter, path.join(bundleRoot, 'log.md'));

    const docService = new OKFDocumentService(repo, indexService, logService, bundleRoot);

    // 3. Initialize MCP Server
    const ocfMcpServer = new OCFMcpServer(docService);
    const serverInstance = ocfMcpServer.getServerInstance();

    // 4. Connect stdio transport
    const transport = new StdioServerTransport();
    await serverInstance.connect(transport);

    console.error('[OCF MCP] Server successfully connected via Stdio transport.');
  } catch (error) {
    console.error('[OCF MCP] Fatal error starting server:', error);
    process.exit(1);
  }
}

// Execute index
main().catch((err) => {
  console.error('[OCF MCP] Unhandled rejection:', err);
  process.exit(1);
});
