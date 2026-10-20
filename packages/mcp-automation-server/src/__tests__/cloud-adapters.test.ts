import { describe, it, expect, vi } from "vitest";
import { ActionRegistry } from "../action-registry.js";
import {
  KubernetesAdapter,
  registerKubernetesActions,
} from "../adapters/k8s-adapter.js";
import {
  registerWebhookActions,
  validateWebhookTargetUrl,
  verifyWebhookSignature,
} from "../adapters/webhook-adapter.js";

describe("Cloud Infrastructure & Signed Webhook Adapters", () => {
  describe("KubernetesAdapter", () => {
    it("enforces namespace allowlist, blocks kube-system, and validates replica bounds", async () => {
      const registry = new ActionRegistry();
      registerKubernetesActions(registry, {
        allowedNamespaces: ["production", "staging"],
        maxReplicas: 10,
        requireChangeWindow: true,
        isChangeWindowOpen: () => false,
        dryRun: true,
      });

      const restartAction = registry.get("k8s_rollout_restart")!;
      const scaleAction = registry.get("k8s_scale_deployment")!;

      // 1. Block system-protected kube-system
      const sysRes = await restartAction.handler!(
        { namespace: "kube-system", deployment: "coredns" },
        { approvalToken: "tok-1" },
      );
      expect(sysRes.success).toBe(false);
      expect(sysRes.error).toContain("system-protected");

      // 2. Block change-window violation when no approvalToken is provided
      const cwRes = await restartAction.handler!(
        { namespace: "production", deployment: "payment-service" },
        {},
      );
      expect(cwRes.success).toBe(false);
      expect(cwRes.error).toContain("Outside approved change window");

      // 3. Succeed with valid HITL approvalToken
      const okRes = await restartAction.handler!(
        { namespace: "production", deployment: "payment-service" },
        { agentId: "sre-bot", approvalToken: "hitl-valid-token" },
      );
      expect(okRes.success).toBe(true);
      expect((okRes.data as { command: string }).command).toContain(
        "kubectl rollout restart deployment/payment-service -n production --dry-run=client",
      );

      // 4. Block replica count exceeding maxReplicas
      const scaleExcess = await scaleAction.handler!(
        {
          namespace: "production",
          deployment: "payment-service",
          replicas: 25,
        },
        { approvalToken: "hitl-valid-token" },
      );
      expect(scaleExcess.success).toBe(false);
      expect(scaleExcess.error).toContain("violates safety bounds");
    });

    it("executes custom runner for pod logs and rollback", async () => {
      const runner = vi.fn().mockResolvedValue({
        stdout: "Rollback completed",
        stderr: "",
        exitCode: 0,
      });
      const adapter = new KubernetesAdapter({
        allowedNamespaces: ["production"],
        dryRun: false,
        runner,
      });

      const rollbackRes = await adapter.rollbackDeployment(
        { namespace: "production", deployment: "auth-service", toRevision: 3 },
        { agentId: "sre-agent" },
      );
      expect(rollbackRes.success).toBe(true);
      expect(runner).toHaveBeenCalledWith([
        "rollout",
        "undo",
        "deployment/auth-service",
        "-n",
        "production",
        "--to-revision=3",
      ]);
    });
  });

  describe("SignedWebhookAdapter", () => {
    it("blocks SSRF targets (cloud metadata, loopback, RFC1918 private IPs)", () => {
      expect(
        validateWebhookTargetUrl("http://169.254.169.254/latest/meta-data")
          .valid,
      ).toBe(false);
      expect(validateWebhookTargetUrl("http://127.0.0.1:8080/hook").valid).toBe(
        false,
      );
      expect(validateWebhookTargetUrl("http://10.0.0.15/internal").valid).toBe(
        false,
      );
      expect(
        validateWebhookTargetUrl("https://hooks.pagerduty.com/v2/enqueue")
          .valid,
      ).toBe(true);
    });

    it("signs payloads with HMAC-SHA256, injects W3C traceparent, and retries transient 5xx failures", async () => {
      let callCount = 0;
      let capturedHeaders: Record<string, string> = {};
      let capturedBody = "";

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        callCount++;
        capturedHeaders = init.headers as Record<string, string>;
        capturedBody = init.body as string;
        if (callCount === 1) {
          return new Response("Service Unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 202 });
      });

      const registry = new ActionRegistry();
      registerWebhookActions(registry, {
        signingSecret: "super-secret-webhook-key-2026",
        allowedHosts: ["events.pagerduty.com"],
        maxRetries: 2,
        baseDelayMs: 5,
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      const action = registry.get("dispatch_signed_webhook")!;
      const res = await action.handler!(
        {
          url: "https://events.pagerduty.com/v2/enqueue",
          eventType: "incident.triggered",
          payload: { service: "payment-service", severity: "critical" },
          traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        },
        { agentId: "ops-agent", domain: "it-operations" },
      );

      expect(res.success).toBe(true);
      expect(callCount).toBe(2);
      expect(capturedHeaders["X-AKCP-Signature-256"]).toMatch(
        /^sha256=[0-9a-f]{64}$/,
      );
      expect(capturedHeaders.traceparent).toMatch(
        /^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/,
      );

      const sigValid = verifyWebhookSignature(
        capturedBody,
        capturedHeaders["X-AKCP-Timestamp"] ?? "",
        capturedHeaders["X-AKCP-Signature-256"] ?? "",
        "super-secret-webhook-key-2026",
      );
      expect(sigValid).toBe(true);
    });
  });
});
