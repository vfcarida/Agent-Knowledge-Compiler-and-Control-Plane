import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  CedarPolicyProvider,
  type CedarRequest,
} from "../../policies/cedar-provider.js";

describe("CedarPolicyProvider HTTP Integration Harness", () => {
  let server: http.Server;
  let serverUrl: string;
  let simulatedBehavior:
    "allow" | "deny" | "malformed" | "server_error" | "hang" = "allow";
  let lastReceivedPayload: CedarRequest | null = null;

  beforeAll(async () => {
    // Spin up an actual real in-process HTTP server simulating an Amazon Cedar Agent daemon
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/health") {
        if (simulatedBehavior === "server_error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "unhealthy" }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "healthy" }));
        }
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/is_authorized") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        if (simulatedBehavior === "hang") {
          // Intentionally do not respond to test client-side timeout handling
          return;
        }

        if (simulatedBehavior === "server_error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Cedar daemon internal evaluation failure",
            }),
          );
          return;
        }

        if (simulatedBehavior === "malformed") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("CORRUPTED_NON_JSON_CEDAR_PAYLOAD");
          return;
        }

        let parsed: CedarRequest;
        try {
          parsed = JSON.parse(body) as CedarRequest;
          lastReceivedPayload = parsed;
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON input" }));
          return;
        }

        // Check if denied by simulated policy or payload context
        const isCritical = parsed.context?.["riskLevel"] === "critical";
        const hasApproval = Boolean(parsed.context?.["hasApprovalToken"]);

        if (simulatedBehavior === "deny" || (isCritical && !hasApproval)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              decision: "Deny",
              diagnostics: {
                reason: ["forbid_unauthorized_critical_remediation"],
                errors: [],
              },
            }),
          );
          return;
        }

        // Allow decision with obligations
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            decision: "Allow",
            diagnostics: {
              reason: ["permit_authenticated_agent_read"],
              errors: [],
            },
            obligations: [
              {
                type: "record_audit_trail",
                parameters: { logDestination: "security.audit.jsonl" },
              },
            ],
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

  it("should evaluate allowed policy over real HTTP and verify Cedar wire schema mapping", async () => {
    simulatedBehavior = "allow";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_customer_ticket",
      agentId: "support-bot-alpha",
      riskLevel: "low",
      scopes: ["tickets:read"],
      sideEffect: "read",
      environment: "production",
    });

    expect(decision.effect).toBe("allow");
    expect(decision.reason).toBe("permit_authenticated_agent_read");
    expect(decision.obligations).toHaveLength(1);
    expect(decision.obligations[0]?.type).toBe("record_audit_trail");
    expect(decision.matchedRule.id).toBe("CEDAR_EXTERNAL_RULE");

    // Verify wire payload conforms to Cedar entity syntax
    expect(lastReceivedPayload).not.toBeNull();
    expect(lastReceivedPayload?.principal).toBe('User::"support-bot-alpha"');
    expect(lastReceivedPayload?.action).toBe('Action::"read_customer_ticket"');
    expect(lastReceivedPayload?.resource).toBe('Resource::"read"');
    expect(lastReceivedPayload?.context["riskLevel"]).toBe("low");
    expect(lastReceivedPayload?.context["environment"]).toBe("production");
    expect(lastReceivedPayload?.context["hasApprovalToken"]).toBe(false);
  });

  it("should evaluate denied policy when critical risk lacks approval token", async () => {
    simulatedBehavior = "allow"; // Wire logic checks riskLevel === critical without approval
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "delete_database",
      agentId: "support-bot-alpha",
      riskLevel: "critical",
      scopes: ["db:admin"],
      sideEffect: "delete",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain(
      "forbid_unauthorized_critical_remediation",
    );
  });

  it("should allow critical action when valid approval token is passed in context", async () => {
    simulatedBehavior = "allow";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "delete_database",
      agentId: "support-bot-alpha",
      riskLevel: "critical",
      scopes: ["db:admin"],
      sideEffect: "delete",
      approvalToken: "valid-hmac-sha256-token",
    });

    expect(decision.effect).toBe("allow");
    expect(lastReceivedPayload?.context["hasApprovalToken"]).toBe(true);
  });

  it("should fail-closed when Cedar daemon returns HTTP 500 error", async () => {
    simulatedBehavior = "server_error";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "support-bot",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Cedar Evaluation Failed");
    expect(decision.reason).toContain("500");
  });

  it("should fail-closed when Cedar daemon returns malformed non-JSON", async () => {
    simulatedBehavior = "malformed";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 2000,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "support-bot",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Cedar Evaluation Failed");
  });

  it("should fail-closed when Cedar network connection times out", async () => {
    simulatedBehavior = "hang";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 150,
    });

    const decision = await provider.evaluate({
      tool: "read_ticket",
      agentId: "support-bot",
      riskLevel: "low",
      sideEffect: "read",
    });

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Cedar Evaluation Failed");
  });

  it("should verify health endpoint lifecycle over real HTTP wire", async () => {
    simulatedBehavior = "allow";
    const provider = new CedarPolicyProvider({
      endpoint: `${serverUrl}/v1/is_authorized`,
      timeoutMs: 1000,
    });

    const healthy = await provider.healthy();
    expect(healthy).toBe(true);

    simulatedBehavior = "server_error";
    const unhealthy = await provider.healthy();
    expect(unhealthy).toBe(false);
  });
});
