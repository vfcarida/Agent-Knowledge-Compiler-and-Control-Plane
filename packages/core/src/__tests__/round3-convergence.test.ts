import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  GENESIS_AUDIT_HASH,
  InMemoryAuditLogService,
  FileAuditLogService,
  computeAuditMerkleRoot,
  verifyAuditLedger,
  verifyPolicyInvariants,
  provePolicyEquivalence,
  compileJsonSchemaToZod,
  validateCapabilityContract,
  type PolicyRule,
} from "../index.js";

describe("Round 3 Convergence — Cryptographic Audit Ledger, Formal Policy Verifier & JSON-Schema-to-Zod Compiler", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-round3-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Front 1: Tamper-Evident Hash-Chained Audit Ledger & Merkle Tree", () => {
    it("chains events from GENESIS_AUDIT_HASH and verifies Merkle root in memory", async () => {
      const ledger = new InMemoryAuditLogService();
      await ledger.logEvent({
        requestId: "req-1",
        actor: "agent-alpha",
        action: "capability.invoke",
        capabilityId: "read_doc",
        decision: "allow",
        riskLevel: "low",
        evidence: { reason: "Read allowed" },
      });
      await ledger.logEvent({
        requestId: "req-2",
        actor: "agent-alpha",
        action: "approval.request",
        capabilityId: "submit_order",
        decision: "require_approval",
        riskLevel: "critical",
        evidence: { reason: "HITL gate" },
      });

      const events = await ledger.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]!.sequence).toBe(0);
      expect(events[0]!.prevHash).toBe(GENESIS_AUDIT_HASH);
      expect(events[1]!.sequence).toBe(1);
      expect(events[1]!.prevHash).toBe(events[0]!.entryHash);

      const report = await ledger.verifyLedger();
      expect(report.valid).toBe(true);
      expect(report.totalEvents).toBe(2);
      expect(report.merkleRoot).not.toBe(GENESIS_AUDIT_HASH);
      expect(report.findings).toHaveLength(0);
    });

    it("detects tampering when an event decision or hash is modified in FileAuditLogService", async () => {
      const logFile = path.join(tmpDir, "audit.log");
      const fileLedger = new FileAuditLogService(logFile);

      await fileLedger.logEvent({
        requestId: "req-a",
        actor: "agent-1",
        action: "capability.invoke",
        decision: "allow",
        riskLevel: "low",
        evidence: {},
      });
      await fileLedger.logEvent({
        requestId: "req-b",
        actor: "agent-1",
        action: "capability.invoke",
        decision: "deny",
        riskLevel: "critical",
        evidence: { reason: "Blocked" },
      });

      const initialCheck = await fileLedger.verifyLedger();
      expect(initialCheck.valid).toBe(true);
      const originalMerkleRoot = initialCheck.merkleRoot;

      // Tamper with the second event's decision in memory
      const events = await fileLedger.getEvents();
      const tampered = events.map((e, idx) =>
        idx === 1 ? { ...e, decision: "allow" as const } : e,
      );
      const tamperCheck = verifyAuditLedger(tampered);
      expect(tamperCheck.valid).toBe(false);
      expect(tamperCheck.findings.length).toBeGreaterThan(0);
      expect(tamperCheck.findings[0]!.reason).toBe("ENTRY_HASH_MISMATCH");

      // Recomputing Merkle root from re-hashed payload yields a different root
      const mutatedRoot = computeAuditMerkleRoot(
        tampered.map((e) => ({ ...e, entryHash: undefined })),
      );
      expect(mutatedRoot).not.toBe(originalMerkleRoot);
    });
  });

  describe("Front 2: Formal Policy Verifier & Equivalence Prover", () => {
    it("verifies safe zero-trust policy rules with zero counterexamples", () => {
      const safeRules: PolicyRule[] = [
        {
          id: "allow-low-read",
          priority: 10,
          effect: "allow",
          match: {
            tools: ["read_*"],
            riskLevels: ["low", "medium"],
            sideEffects: ["read"],
          },
        },
        {
          id: "gate-critical-and-submit",
          priority: 20,
          effect: "allow",
          match: {
            tools: ["*"],
          },
          obligations: [{ type: "require_approval" }],
        },
      ];

      const report = verifyPolicyInvariants(safeRules);
      expect(report.verified).toBe(true);
      expect(report.statesExplored).toBeGreaterThan(0);
      expect(report.counterexamples).toHaveLength(0);
      expect(report.invariantResults.every((r) => r.passed)).toBe(true);
    });

    it("identifies concrete counterexamples when a policy allows unapproved critical or submit actions", () => {
      const unsafeRules: PolicyRule[] = [
        {
          id: "reckless-allow-all",
          priority: 1,
          effect: "allow",
          match: { tools: ["*"] },
        },
      ];

      const report = verifyPolicyInvariants(unsafeRules);
      expect(report.verified).toBe(false);
      expect(report.counterexamples.length).toBeGreaterThan(0);
      const violatedIds = new Set(
        report.counterexamples.map((c) => c.invariantId),
      );
      expect(violatedIds.has("NO_UNAPPROVED_CRITICAL_EXECUTION")).toBe(true);
      expect(violatedIds.has("NO_UNAPPROVED_EXTERNAL_SUBMIT")).toBe(true);
    });

    it("proves semantic equivalence and detects diverging policy rule sets", () => {
      const rulesA: PolicyRule[] = [
        {
          id: "rule-a",
          priority: 10,
          effect: "allow",
          match: {
            tools: ["read_document"],
            riskLevels: ["low"],
            sideEffects: ["read"],
          },
        },
      ];
      const rulesB: PolicyRule[] = [
        {
          id: "rule-b-renamed",
          priority: 50,
          effect: "allow",
          match: {
            tools: ["read_document"],
            riskLevels: ["low"],
            sideEffects: ["read"],
          },
        },
      ];
      const rulesC: PolicyRule[] = [
        {
          id: "rule-c-wider",
          priority: 10,
          effect: "allow",
          match: {
            tools: ["read_document"],
            riskLevels: ["low", "medium"],
            sideEffects: ["read"],
          },
        },
      ];

      const eqAB = provePolicyEquivalence(rulesA, rulesB);
      expect(eqAB.equivalent).toBe(true);
      expect(eqAB.divergingStates).toHaveLength(0);

      const eqAC = provePolicyEquivalence(rulesA, rulesC);
      expect(eqAC.equivalent).toBe(false);
      expect(eqAC.divergingStates.length).toBeGreaterThan(0);
    });
  });

  describe("Front 3: Deterministic JSON-Schema to Zod Compiler", () => {
    it("compiles complex nested JSON Schema objects, enums, numbers, and string formats to Zod", () => {
      const jsonSchema: Record<string, unknown> = {
        type: "object",
        required: ["email", "priority", "tags"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
          priority: { type: "integer", minimum: 1, maximum: 5 },
          status: { enum: ["open", "pending", "closed"] },
          tags: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 2 },
          },
        },
      };

      const zodSchema = compileJsonSchemaToZod(jsonSchema);

      const validPayload = {
        email: "ops@example.com",
        priority: 3,
        status: "open",
        tags: ["security", "urgent"],
      };
      expect(zodSchema.safeParse(validPayload).success).toBe(true);

      const invalidEmail = validateCapabilityContract(jsonSchema, {
        ...validPayload,
        email: "not-an-email",
      });
      expect(invalidEmail.valid).toBe(false);
      expect(invalidEmail.errors?.[0]).toContain("email");

      const extraProp = validateCapabilityContract(jsonSchema, {
        ...validPayload,
        undeclaredField: true,
      });
      expect(extraProp.valid).toBe(false);
    });
  });
});
