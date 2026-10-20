import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  KmsEnvelopeKeyring,
  buildAttestation,
  QuorumApprovalStore,
  generatePolicyExecutionProof,
  verifyPolicyExecutionProof,
  compressDocumentSemantically,
  packWithAdaptiveBudget,
  CostTracker,
  type BuildManifest,
  type PolicyRule,
} from "../index.js";

describe("KMS Envelope Keyring, Multi-Party Quorum CRDT, ZK Policy Proofs & Adaptive Context Compressor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-kms-quorum-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Front 1: KMS Envelope Signer & Multi-Key Keyring with Rotation and Revocation", () => {
    it("wraps private keys with AES-256-GCM, rotates keys while verifying historical signatures, and rejects revoked keys", () => {
      const keyringPath = path.join(tmpDir, "keyring.json");
      const kek = "enterprise-master-kek-2026";
      const keyring = new KmsEnvelopeKeyring();

      const key1 = keyring.generateKey(kek, true);
      expect(key1.status).toBe("active");
      expect(key1.wrappedPrivateKey?.algorithm).toBe("aes-256-gcm");

      const sampleManifest: BuildManifest = {
        bundleId: "bundle-kms",
        buildId: "b-01",
        createdAt: new Date().toISOString(),
        compilerVersion: "0.2.0",
        sources: [],
        targets: [
          {
            name: "ir-json",
            outputs: ["dist/ir.json"],
            hash: "a".repeat(64),
          },
        ],
      };
      const attestation = buildAttestation(sampleManifest);

      // Sign with key1
      const signedByKey1 = keyring.signWithActiveKey(attestation, kek);
      expect(keyring.verifyWithKeyring(signedByKey1).valid).toBe(true);

      // Wrong KEK must fail unwrapping
      expect(() =>
        keyring.signWithActiveKey(attestation, "wrong-kek"),
      ).toThrow();

      // Rotate key -> key1 becomes retired, key2 becomes active
      const key2 = keyring.rotateKey(kek);
      expect(key2.keyId).not.toBe(key1.keyId);
      expect(keyring.getManifest().activeKeyId).toBe(key2.keyId);

      // Historical signature by retired key1 is still valid!
      const verifyRetired = keyring.verifyWithKeyring(signedByKey1);
      expect(verifyRetired.valid).toBe(true);
      expect(verifyRetired.keyStatus).toBe("retired");

      // Persist and reload keyring
      keyring.saveToFile(keyringPath);
      const reloaded = KmsEnvelopeKeyring.loadFromFile(keyringPath);

      // Revoke key1 -> signature by key1 must now be rejected
      reloaded.revokeKey(key1.keyId);
      const verifyRevoked = reloaded.verifyWithKeyring(signedByKey1);
      expect(verifyRevoked.valid).toBe(false);
      expect(verifyRevoked.keyStatus).toBe("revoked");
    });
  });

  describe("Front 2: Multi-Party M-of-N Quorum Approval Store & CRDT Multi-Cluster Replication", () => {
    it("enforces 2-of-N distinct supervisors on critical operations, blocks self-approval, and merges CRDT snapshots across clusters", () => {
      const clusterUS = new QuorumApprovalStore({
        clusterId: "us-east-1",
        riskQuorumMap: { critical: 2, low: 1 },
        disallowSelfApproval: true,
      });
      const clusterEU = new QuorumApprovalStore({
        clusterId: "eu-west-1",
        riskQuorumMap: { critical: 2, low: 1 },
        disallowSelfApproval: true,
      });

      const token = clusterUS.generateToken(
        "req-99",
        "k8s.rollout_restart",
        "sha256:payload123",
        "critical",
        "external-write",
        "agent-sre",
      );

      // Self-approval by requester 'agent-sre' is rejected
      expect(clusterUS.approveToken(token, "agent-sre")).toBe(false);

      // First supervisor votes in US cluster -> still PENDING (1 of 2)
      expect(clusterUS.approveToken(token, "alice@corp")).toBe(false);
      expect(clusterUS.getApprovalRecord(token)?.status).toBe("PENDING");

      // Replicate US state to EU cluster
      clusterEU.mergeRemoteSnapshot(clusterUS.exportStateSnapshot());
      expect(
        clusterEU.getApprovalRecord(token)?.approvalsReceived,
      ).toHaveLength(1);

      // Second distinct supervisor votes in EU cluster -> reaches 2 of 2 -> APPROVED!
      expect(clusterEU.approveToken(token, "bob@corp")).toBe(true);
      expect(clusterEU.getApprovalRecord(token)?.status).toBe("APPROVED");

      // Merge EU snapshot back into US cluster -> US promotes token to APPROVED
      const mergeRes = clusterUS.mergeRemoteSnapshot(
        clusterEU.exportStateSnapshot(),
      );
      expect(mergeRes.newlyApprovedTokens).toContain(token);
      expect(clusterUS.getApprovalRecord(token)?.status).toBe("APPROVED");

      // Consume token once in US cluster
      expect(
        clusterUS.validateAndConsume(
          token,
          "k8s.rollout_restart",
          "sha256:payload123",
        ),
      ).toBe(true);
      // Replay is blocked
      expect(
        clusterUS.validateAndConsume(
          token,
          "k8s.rollout_restart",
          "sha256:payload123",
        ),
      ).toBe(false);
    });
  });

  describe("Front 3: Privacy-Preserving Selective-Disclosure Policy Proofs", () => {
    it("generates a salted commitment Merkle proof disclosing only riskLevel and sideEffect while blinding agentId and tool", () => {
      const rules: PolicyRule[] = [
        {
          id: "allow-prod-read",
          priority: 10,
          effect: "allow",
          match: {
            tools: ["read_*"],
            riskLevels: ["low"],
            sideEffects: ["read"],
          },
        },
      ];

      const proof = generatePolicyExecutionProof(
        rules,
        {
          tool: "read_secret_roadmap",
          agentId: "agent-classified-007",
          riskLevel: "low",
          scopes: ["internal:read"],
          environment: "production",
          sideEffect: "read",
        },
        ["riskLevel", "sideEffect"],
      );

      // Ensure sensitive fields are NOT in disclosedOpenings
      const disclosedKeys = proof.disclosedOpenings.map((o) => o.attribute);
      expect(disclosedKeys).toEqual(["riskLevel", "sideEffect"]);
      expect(JSON.stringify(proof.disclosedOpenings)).not.toContain(
        "agent-classified-007",
      );

      // Verify proof cryptographically
      const verifyRes = verifyPolicyExecutionProof(proof, {
        expectedPolicyTarget: rules,
        requiredDisclosedAttributes: ["riskLevel", "sideEffect"],
      });
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.hiddenAttributes).toContain("agentId");
      expect(verifyRes.hiddenAttributes).toContain("tool");

      // Tampering with a disclosed value invalidates the commitment opening
      const tamperedProof = {
        ...proof,
        disclosedOpenings: proof.disclosedOpenings.map((o) =>
          o.attribute === "riskLevel" ? { ...o, value: "critical" } : o,
        ),
      };
      expect(verifyPolicyExecutionProof(tamperedProof).valid).toBe(false);
    });
  });

  describe("Front 4: Semantic-Preserving Adaptive Context Compressor & FinOps Governor", () => {
    it("compresses spillover documents while preserving headings, MUST/NEVER invariants, and [[WikiLinks]] under CostTracker budget constraints", () => {
      const longDoc = [
        "# Incident Response Runbook",
        "This is a general introductory paragraph with background details that can be omitted when under tight token pressure.",
        "Another long narrative paragraph explaining historical context from several years ago in verbose prose.",
        "## Safety Invariants",
        "- Agents MUST verify checksums before restarting any database node.",
        "- Agents NEVER execute destructive drop commands in production.",
        "See [[database-recovery-guide]] and [[oncall-escalation-policy]] for details.",
        "Additional low-priority filler text repeated to increase token count beyond the tight budget threshold.",
        "More filler text that should be stripped during semantic compression to save tokens.",
      ].join("\n");

      const compressed = compressDocumentSemantically(longDoc, 45);
      expect(compressed.compressedTokens).toBeLessThanOrEqual(45);
      expect(compressed.compressedTokens).toBeLessThan(
        compressed.originalTokens,
      );
      expect(compressed.compressedContent).toContain(
        "# Incident Response Runbook",
      );
      expect(compressed.compressedContent).toContain("MUST");
      expect(compressed.preservedLinks).toContain("database-recovery-guide");

      const costTracker = new CostTracker({
        agentBudgets: { "agent-finops": 200 },
      });
      // Record 130 tokens already consumed -> 70 tokens remaining
      costTracker.recordUsage("agent-finops", 130, "read_doc");

      const packReport = packWithAdaptiveBudget(
        [
          {
            id: "doc-1",
            title: "Primary Concept",
            content: "Short high priority concept.",
            relevanceScore: 0.95,
          },
          {
            id: "doc-2",
            title: "Runbook",
            content: longDoc,
            relevanceScore: 0.8,
          },
        ],
        {
          baseBudgetTokens: 500,
          agentId: "agent-finops",
          costTracker,
          minGuaranteedTokens: 60,
        },
      );

      expect(packReport.effectiveBudgetTokens).toBe(70);
      expect(packReport.usedTokens).toBeLessThanOrEqual(70);
      expect(packReport.packedItems).toHaveLength(2);
      expect(packReport.packedItems[0]!.mode).toBe("full");
      expect(packReport.packedItems[1]!.mode).toBe("compressed");
    });
  });
});
