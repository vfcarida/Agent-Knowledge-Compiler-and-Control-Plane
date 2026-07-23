import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type express from "express";

export interface ServerConfig {
  auth?: { jwt?: { secret?: string }; apiKey?: string };
  insecureNoAuth?: boolean;
}

function validateRemoteConfig(config: ServerConfig) {
  if (!config.auth && !config.insecureNoAuth) {
    throw new Error(
      "Remote transport requires authentication configuration.\n" +
        "Set auth.jwt.secret or auth.apiKey in config, or pass --insecure-no-auth for development.\n" +
        "Running a remote MCP server without authentication is a security risk.",
    );
  }

  if (config.insecureNoAuth) {
    console.warn(
      "[SECURITY WARNING] Running remote server WITHOUT authentication.\n" +
        "This is acceptable for local development only.\n" +
        "DO NOT use --insecure-no-auth in production.",
    );
  }
}

export function createSseTransport(
  config: ServerConfig,
  endpoint: string,
  res?: express.Response,
): SSEServerTransport {
  validateRemoteConfig(config);

  // We allow res to be optional just to satisfy the synchronous unit test
  // without needing a full express mock if we are just testing the config validation.
  // In real usage, res is required.

  return new SSEServerTransport(endpoint, res as any);
}

export function createStreamableHttpTransport(
  config: ServerConfig,
): StreamableHTTPServerTransport {
  validateRemoteConfig(config);
  return new StreamableHTTPServerTransport();
}

export function createStdioTransport(
  _config: ServerConfig,
): StdioServerTransport {
  return new StdioServerTransport();
}
