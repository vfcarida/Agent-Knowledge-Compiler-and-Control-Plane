import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { OPAPolicyProvider } from "../../policies/opa-provider.js";
import type { PolicyRequest } from "../../policies/engine.js";

describe("OPAPolicyProvider HTTP Integration Harness", () => {
  let server: http.Server;
  let serverUrl: string;
  let simulatedBehavior:
    "allow" | "deny" | "malformed" | "server_error" | "hang" = "allow";

  beforeAll(async () => {
    // Spin up an actual real in-process HTTP server simulating an OPA daemon
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/health") {
        if (simulatedBehavior === "server_error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "unhealthy" }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        }
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/data/akcp/authz") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        if (simulatedBehavior === "hang") {
          // Intentionally do not respond to trigger client timeout
          return;
        }

        if (simulatedBehavior === "server_error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal OPA evaluator panic" }));
          return;
        }

        if (simulatedBehavior === "malformed") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("NOT_JSON_DATA_CORRUPT");
          return;
        }

        // Parse OPA input payload
        let parsedInput: { input?: PolicyRequest } = {};
        try {
          parsedInput = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "bad_json" }));
          return;
        }

        const request = parsedInput.input;

        if (simulatedBehavior === "deny" || request?.riskLevel === "critical") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              result: {
                allow: false,
                reason:
                  "Critical mutating operations denied by simulated OPA policy",
                matched_rule: {
                  id: "REGO_DENY_CRITICAL",
                  effect: "deny",
                },
              },
            }),
          );
          return;
        }

        // Default allow behavior
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            result: {
              allow: true,
              reason: "Permitted by OPA access rules",
              obligations: [
                {
                  type: "audit_log",
                  parameters: { destination: "audit.jsonl" },
                },
              ],
              matched_rule: {
                id: "REGO_ALLOW_STANDARD",
                effect: "allow",
                priority: 10,
              },
            },
          }),
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("should successfully evaluate allowed decision over real HTTP wire", async () => {
    simulatedBehavior = "allow";
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "support-agent-1",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("allow");
    expect(decision.reason).toBe("Permitted by OPA access rules");
    expect(decision.obligations).toHaveLength(1);
    expect(decision.obligations[0]?.type).toBe("audit_log");
    expect(decision.matchedRule.id).toBe("REGO_ALLOW_STANDARD");
  });

  it("should evaluate denied decision based on request payload attributes", async () => {
    simulatedBehavior = "allow"; // logic in server checks riskLevel === "critical"
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "drop_database_table",
      agentId: "support-agent-1",
      riskLevel: "critical",
      sideEffect: "delete",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Critical mutating operations denied");
    expect(decision.matchedRule.id).toBe("REGO_DENY_CRITICAL");
  });

  it("should fail-closed when OPA server returns HTTP 500 error", async () => {
    simulatedBehavior = "server_error";
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "agent-1",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("OPA Evaluation Failed");
    expect(decision.reason).toContain("500");
  });

  it("should fail-closed when OPA responds with unparseable non-JSON data", async () => {
    simulatedBehavior = "malformed";
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "agent-1",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("OPA Evaluation Failed");
  });

  it("should fail-closed when OPA connection times out", async () => {
    simulatedBehavior = "hang";
    // Set a very short timeout for test speed
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 150,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "agent-1",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("OPA Evaluation Failed");
  });

  it("should verify health endpoint lifecycle over real HTTP", async () => {
    simulatedBehavior = "allow";
    const provider = new OPAPolicyProvider({
      endpoint: `${serverUrl}/v1/data/akcp/authz`,
      timeoutMs: 1000,
    });

    const healthy = await provider.healthy();
    expect(healthy).toBe(true);

    simulatedBehavior = "server_error";
    const unhealthy = await provider.healthy();
    expect(unhealthy).toBe(false);
  });
});
