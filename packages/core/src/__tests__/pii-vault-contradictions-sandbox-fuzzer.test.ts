import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  PiiTokenVault,
  detectKnowledgeContradictions,
  VmPluginSandbox,
  PluginSecurityError,
  runAdversarialRedTeamSuite,
  type ContradictionConceptInput,
  type PluginManifest,
} from "../index.js";

describe("Reversible PII Token Vault, Epistemic Contradiction Detector, OCap VM Plugin Sandbox & Red-Team Fuzzer", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-vault-sandbox-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Front 1: Reversible Format-Preserving PII Token Vault", () => {
    it("deterministically tokenizes PII into format-preserving tokens and decrypts back on authorized detokenization", () => {
      const vault = new PiiTokenVault("master-vault-secret-enterprise");
      const rawPayload = {
        customerEmail: "alice@example.com",
        secondaryContact: "alice@example.com",
        ssn: "123-45-6789",
        note: "Contact alice@example.com regarding SSN 123-45-6789.",
      };

      const { tokenizedPayload, tokensCreated } =
        vault.tokenizePayload(rawPayload);

      // Format-preserving email token
      expect(tokenizedPayload.customerEmail).toMatch(
        /^tkn_[0-9a-f]{12}@vault\.akcp\.local$/,
      );
      // Deterministic co-reference: identical plaintext maps to identical token
      expect(tokenizedPayload.customerEmail).toBe(
        tokenizedPayload.secondaryContact,
      );
      expect(tokenizedPayload.ssn).toMatch(/^tkn_ssn_[0-9a-f]{12}$/);
      expect(JSON.stringify(tokenizedPayload)).not.toContain(
        "alice@example.com",
      );
      expect(JSON.stringify(tokenizedPayload)).not.toContain("123-45-6789");
      expect(tokensCreated.length).toBeGreaterThanOrEqual(4);

      // Selective detokenization (only email class allowed)
      const emailOnly = vault.detokenizePayload(tokenizedPayload, {
        allowedPiiClasses: ["email"],
      });
      expect(emailOnly.detokenizedPayload.customerEmail).toBe(
        "alice@example.com",
      );
      expect(emailOnly.detokenizedPayload.ssn).toMatch(/^tkn_ssn_/);

      // Full detokenization restores original payload identically
      const fullRestore = vault.detokenizePayload(tokenizedPayload);
      expect(fullRestore.detokenizedPayload).toEqual(rawPayload);
    });
  });

  describe("Front 2: Semantic Contradiction & Epistemic Drift Detector", () => {
    it("detects normative polarity conflicts (MUST vs NEVER) and numeric SLA divergences across concepts", () => {
      const concepts: ContradictionConceptInput[] = [
        {
          conceptId: "payment-runbook-v1",
          lifecycleStatus: "active",
          markdownContent: [
            "# Payment Runbook",
            "Operators MUST enable automatic failover on the primary database cluster.",
            "request_timeout: 30s",
          ].join("\n"),
        },
        {
          conceptId: "payment-policy-v2",
          lifecycleStatus: "active",
          markdownContent: [
            "# Payment Policy",
            "Operators NEVER enable automatic failover on the primary database cluster.",
            "request_timeout: 120s",
          ].join("\n"),
        },
      ];

      const report = detectKnowledgeContradictions(concepts);
      expect(report.contradictionsFound).toBe(2);
      expect(report.hasCriticalContradictions).toBe(true);

      const kinds = new Set(report.contradictions.map((c) => c.kind));
      expect(kinds.has("POLARITY_CONFLICT")).toBe(true);
      expect(kinds.has("NUMERIC_SLA_CONFLICT")).toBe(true);
    });
  });

  describe("Front 3: Isolated Object-Capability (OCap) VM Plugin Sandbox", () => {
    it("allows declared permissions within confined root, blocks undeclared permissions, and prevents path traversal", () => {
      const sampleFile = path.join(tmpDir, "bundle-note.txt");
      fs.writeFileSync(sampleFile, "governed-okf-content", "utf-8");

      const readOnlyManifest: PluginManifest = {
        akcpPluginVersion: "1.0.0",
        name: "safe-normalizer-plugin",
        version: "0.1.0",
        type: "normalizer",
        permissions: ["fs:read"],
        entrypoint: "index.js",
      };

      const sandbox = new VmPluginSandbox(readOnlyManifest);

      // 1. Allowed fs:read within root succeeds
      const execOk = sandbox.executeCode<string>(
        `const text = akcpHost.readFile("bundle-note.txt"); module.exports = text.toUpperCase();`,
        { allowedRootDir: tmpDir },
      );
      expect(execOk.output).toBe("GOVERNED-OKF-CONTENT");
      expect(execOk.permissionsUsed).toContain("fs:read");

      // 2. Undeclared fs:write permission throws PluginSecurityError
      expect(() =>
        sandbox.executeCode(`akcpHost.writeFile("hacked.txt", "pwned");`, {
          allowedRootDir: tmpDir,
        }),
      ).toThrow(PluginSecurityError);

      // 3. Path traversal outside allowedRootDir throws PluginSecurityError
      expect(() =>
        sandbox.executeCode(`akcpHost.readFile("../../etc/passwd");`, {
          allowedRootDir: tmpDir,
        }),
      ).toThrow(PluginSecurityError);
    });
  });

  describe("Front 4: Red-Team Adversarial Policy Fuzzer", () => {
    it("achieves 100% resilience score against baseline zero-trust rules and detects breaches on reckless policies", async () => {
      const baselineReport = await runAdversarialRedTeamSuite();
      expect(baselineReport.passed).toBe(true);
      expect(baselineReport.resilienceScore).toBe(1);
      expect(baselineReport.breachedVectors).toBe(0);

      // Reckless allow-all policy breaches non-WAF vectors
      const recklessReport = await runAdversarialRedTeamSuite([
        {
          id: "allow-everything",
          priority: 1,
          effect: "allow",
          match: { tools: ["*"] },
        },
      ]);
      expect(recklessReport.passed).toBe(false);
      expect(recklessReport.breachedVectors).toBeGreaterThan(0);
    });
  });
});
