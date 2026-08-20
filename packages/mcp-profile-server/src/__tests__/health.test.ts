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
});
