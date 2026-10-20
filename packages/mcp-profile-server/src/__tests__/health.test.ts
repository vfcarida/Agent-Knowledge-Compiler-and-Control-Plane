import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createProfileHttpApp } from "../http-server.js";
import type { AgentKnowledgeIR } from "@akcp/core";

describe("MCP Profile Server Health Check Endpoints", () => {
  let activeServer: Server | undefined;

  afterEach(async () => {
    if (activeServer) {
      await new Promise<void>((resolve, reject) => {
        activeServer!.close((err) => (err ? reject(err) : resolve()));
      });
      activeServer = undefined;
    }
  });

  const startServer = (
    app: ReturnType<typeof createProfileHttpApp>,
  ): Promise<{ url: string; server: Server }> => {
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        activeServer = server;
        resolve({ url: `http://127.0.0.1:${port}`, server });
      });
    });
  };

  const mockIR: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "health-test-bundle",
    buildId: "test-build-1",
    timestamp: new Date().toISOString(),
    concepts: [],
    capabilities: [],
    links: [],
    metadata: { createdAt: new Date().toISOString() },
  };

  it("should return 200 and { status: 'ok' } on /healthz", async () => {
    const app = createProfileHttpApp({ allowInsecureDev: true });
    const { url } = await startServer(app);

    const res = await fetch(`${url}/healthz`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("should return 503 and { status: 'not_ready', ir_loaded: false } on /readyz when IR is not loaded", async () => {
    const app = createProfileHttpApp({ ir: undefined, allowInsecureDev: true });
    const { url } = await startServer(app);

    const res = await fetch(`${url}/readyz`);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body).toEqual({ status: "not_ready", ir_loaded: false });
  });

  it("should return 200 and { status: 'ready', ir_loaded: true } on /readyz when IR is loaded", async () => {
    const app = createProfileHttpApp({ ir: mockIR, allowInsecureDev: true });
    const { url } = await startServer(app);

    const res = await fetch(`${url}/readyz`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: "ready", ir_loaded: true });
  });

  it("should support dynamic readiness state via getter function", async () => {
    let currentIr: AgentKnowledgeIR | null = null;
    const app = createProfileHttpApp({
      ir: () => currentIr,
      allowInsecureDev: true,
    });
    const { url } = await startServer(app);

    // Before IR loaded
    const res1 = await fetch(`${url}/readyz`);
    expect(res1.status).toBe(503);
    expect(await res1.json()).toEqual({
      status: "not_ready",
      ir_loaded: false,
    });

    // After IR loaded
    currentIr = mockIR;
    const res2 = await fetch(`${url}/readyz`);
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({
      status: "ready",
      ir_loaded: true,
    });
  });

  it("should allow /healthz and /readyz without requiring auth token even when JWT secret is configured", async () => {
    const app = createProfileHttpApp({
      ir: mockIR,
      jwtSecret: "super-secret-key-12345678901234567890",
    });
    const { url } = await startServer(app);

    // No Authorization header sent
    const healthRes = await fetch(`${url}/healthz`);
    expect(healthRes.status).toBe(200);
    expect(await healthRes.json()).toEqual({ status: "ok" });

    const readyRes = await fetch(`${url}/readyz`);
    expect(readyRes.status).toBe(200);
    expect(await readyRes.json()).toEqual({ status: "ready", ir_loaded: true });

    // Protected MCP SSE endpoint should reject without auth
    const sseRes = await fetch(`${url}/mcp/sse`);
    expect(sseRes.status).toBe(401);
  });

  it("should serve Streamable HTTP JSON-RPC 2.0 requests on POST /mcp and verify Ed25519 attestations", async () => {
    const { generateSigningKeyPair, buildAttestation, signAttestation } =
      await import("@akcp/core");
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const attestation = buildAttestation({
      schemaVersion: "1.0.0",
      buildId: "build-test-1",
      createdAt: new Date().toISOString(),
      source: { root: ".", config: "akcp.yaml", hash: "abc1234" },
      compiler: { name: "akcp", version: "0.1.0" },
      targets: [
        {
          name: "context-pack",
          status: "success",
          outputs: ["dist/ir.json"],
          hash: "deadbeef",
        },
      ],
      diagnostics: [],
      conformance: { level: "L3", checks: [] },
    });
    const signedAttestation = signAttestation(attestation, privateKeyPem);

    const irWithConcept: AgentKnowledgeIR = {
      ...mockIR,
      concepts: [
        {
          conceptId: "runbook-1",
          type: "Runbook",
          frontmatter: { type: "Runbook", title: "Runbook 1" },
          body: "Step 1: Verify cluster status.",
          budget: { byteSize: 30, estimatedTokens: 8 },
          source: { format: "okf/markdown", filePath: "runbook-1.md" },
        },
      ],
    };

    const app = createProfileHttpApp({
      ir: irWithConcept,
      allowInsecureDev: true,
      signedAttestation,
      publicKeyPem,
    });
    const { url } = await startServer(app);

    // 1. initialize
    const initRes = await fetch(`${url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    });
    expect(initRes.status).toBe(200);
    const initBody = (await initRes.json()) as any;
    expect(initBody.result.protocolVersion).toBe("2025-03-26");

    // 2. resources/list
    const listRes = await fetch(`${url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "resources/list" }),
    });
    const listBody = (await listRes.json()) as any;
    expect(listBody.result.resources).toHaveLength(1);
    expect(listBody.result.resources[0].name).toBe("runbook-1");

    // 3. tools/call read_document_chunk
    const callRes = await fetch(`${url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "read_document_chunk",
          arguments: { conceptId: "runbook-1", offset: 0, limit: 100 },
        },
      }),
    });
    const callBody = (await callRes.json()) as any;
    const parsedChunk = JSON.parse(callBody.result.content[0].text);
    expect(parsedChunk.conceptId).toBe("runbook-1");
    expect(parsedChunk.chunk).toContain("Step 1: Verify cluster status.");
  });
});
