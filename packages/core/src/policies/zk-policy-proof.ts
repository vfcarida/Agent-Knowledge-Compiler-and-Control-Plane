import crypto from "node:crypto";
import {
  evaluatePolicies,
  type PolicyDecision,
  type PolicyRequest,
} from "./engine.js";
import {
  normalizePolicyTarget,
  type PolicyTargetInput,
} from "./formal-verifier.js";

export type RequestAttributeKey =
  | "tool"
  | "agentId"
  | "riskLevel"
  | "scopes"
  | "approvalToken"
  | "environment"
  | "sideEffect";

const ORDERED_ATTRIBUTE_KEYS: RequestAttributeKey[] = [
  "agentId",
  "approvalToken",
  "environment",
  "riskLevel",
  "scopes",
  "sideEffect",
  "tool",
];

export interface DisclosedAttributeOpening {
  attribute: RequestAttributeKey;
  value: unknown;
  blindingNonceHex: string;
}

export interface PolicyExecutionProof {
  schemaVersion: "akcp.zk-policy-proof/v1";
  createdAt: string;
  policySetHash: string;
  attributeCommitments: Record<RequestAttributeKey, string>;
  attributeMerkleRoot: string;
  disclosedOpenings: DisclosedAttributeOpening[];
  decision: {
    effect: PolicyDecision["effect"];
    matchedRuleId: string;
    obligations: string[];
  };
  proofDigest: string;
}

export interface ProofVerificationResult {
  valid: boolean;
  verifiedDisclosedAttributes: RequestAttributeKey[];
  hiddenAttributes: RequestAttributeKey[];
  reason?: string;
}

function canonicalAttributeString(value: unknown): string {
  if (value === undefined || value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return JSON.stringify([...value].sort());
  }
  return JSON.stringify(value);
}

export function computeAttributeCommitment(
  attribute: RequestAttributeKey,
  value: unknown,
  blindingNonceHex: string,
): string {
  const payload = `akcp.attr.v1|${attribute}|${canonicalAttributeString(value)}|${blindingNonceHex}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

export function computeCommitmentsMerkleRoot(
  commitments: Record<RequestAttributeKey, string>,
): string {
  let level = ORDERED_ATTRIBUTE_KEYS.map((k) => commitments[k]);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1] ?? left;
      const hash = crypto
        .createHash("sha256")
        .update(`${left}:${right}`, "utf8")
        .digest("hex");
      next.push(hash);
    }
    level = next;
  }
  return level[0]!;
}

export function computePolicySetHash(target: PolicyTargetInput): string {
  const rules = normalizePolicyTarget(target);
  const canonical = JSON.stringify(
    [...rules].sort(
      (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
    ),
  );
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

function computeProofDigest(
  policySetHash: string,
  attributeMerkleRoot: string,
  decision: PolicyExecutionProof["decision"],
): string {
  const payload = JSON.stringify({
    policySetHash,
    attributeMerkleRoot,
    decision: {
      effect: decision.effect,
      matchedRuleId: decision.matchedRuleId,
      obligations: [...decision.obligations].sort(),
    },
  });
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Generates a privacy-preserving policy execution proof using salted SHA-256
 * cryptographic commitments and selective disclosure openings.
 * Sensitive attributes omitted from `discloseFields` remain hidden behind
 * 256-bit blinding nonces while still bound into `attributeMerkleRoot`.
 */
export function generatePolicyExecutionProof(
  target: PolicyTargetInput,
  request: PolicyRequest,
  discloseFields: RequestAttributeKey[] = ["riskLevel", "sideEffect"],
): PolicyExecutionProof {
  const rules = normalizePolicyTarget(target);
  const rawDecision = evaluatePolicies(rules, request);
  const policySetHash = computePolicySetHash(rules);

  const nonces: Record<RequestAttributeKey, string> = {
    agentId: crypto.randomBytes(32).toString("hex"),
    approvalToken: crypto.randomBytes(32).toString("hex"),
    environment: crypto.randomBytes(32).toString("hex"),
    riskLevel: crypto.randomBytes(32).toString("hex"),
    scopes: crypto.randomBytes(32).toString("hex"),
    sideEffect: crypto.randomBytes(32).toString("hex"),
    tool: crypto.randomBytes(32).toString("hex"),
  };

  const attributeValues: Record<RequestAttributeKey, unknown> = {
    agentId: request.agentId,
    approvalToken: request.approvalToken ?? null,
    environment: request.environment ?? null,
    riskLevel: request.riskLevel,
    scopes: request.scopes,
    sideEffect: request.sideEffect ?? null,
    tool: request.tool,
  };

  const attributeCommitments = {} as Record<RequestAttributeKey, string>;
  for (const key of ORDERED_ATTRIBUTE_KEYS) {
    attributeCommitments[key] = computeAttributeCommitment(
      key,
      attributeValues[key],
      nonces[key],
    );
  }

  const attributeMerkleRoot =
    computeCommitmentsMerkleRoot(attributeCommitments);

  const discloseSet = new Set<RequestAttributeKey>(discloseFields);
  const disclosedOpenings: DisclosedAttributeOpening[] = [];
  for (const key of ORDERED_ATTRIBUTE_KEYS) {
    if (discloseSet.has(key)) {
      disclosedOpenings.push({
        attribute: key,
        value: attributeValues[key],
        blindingNonceHex: nonces[key],
      });
    }
  }

  const decisionSummary: PolicyExecutionProof["decision"] = {
    effect: rawDecision.effect,
    matchedRuleId: rawDecision.matchedRule.id,
    obligations: rawDecision.obligations.map((o) => o.type).sort(),
  };

  const proofDigest = computeProofDigest(
    policySetHash,
    attributeMerkleRoot,
    decisionSummary,
  );

  return {
    schemaVersion: "akcp.zk-policy-proof/v1",
    createdAt: new Date().toISOString(),
    policySetHash,
    attributeCommitments,
    attributeMerkleRoot,
    disclosedOpenings,
    decision: decisionSummary,
    proofDigest,
  };
}

/**
 * Verifies a privacy-preserving PolicyExecutionProof without requiring access
 * to non-disclosed (blinded) request attributes.
 */
export function verifyPolicyExecutionProof(
  proof: PolicyExecutionProof,
  options?: {
    expectedPolicyTarget?: PolicyTargetInput;
    requiredDisclosedAttributes?: RequestAttributeKey[];
  },
): ProofVerificationResult {
  // 1. Check optional policy set hash binding
  if (options?.expectedPolicyTarget) {
    const expectedHash = computePolicySetHash(options.expectedPolicyTarget);
    if (proof.policySetHash !== expectedHash) {
      return {
        valid: false,
        verifiedDisclosedAttributes: [],
        hiddenAttributes: [],
        reason: `Policy set hash mismatch: expected ${expectedHash}, got ${proof.policySetHash}`,
      };
    }
  }

  // 2. Verify each disclosed opening against its salted commitment
  const verifiedDisclosed: RequestAttributeKey[] = [];
  for (const opening of proof.disclosedOpenings) {
    const recordedCommitment = proof.attributeCommitments[opening.attribute];
    if (!recordedCommitment) {
      return {
        valid: false,
        verifiedDisclosedAttributes: [],
        hiddenAttributes: [],
        reason: `Missing commitment for disclosed attribute '${opening.attribute}'.`,
      };
    }
    const recomputed = computeAttributeCommitment(
      opening.attribute,
      opening.value,
      opening.blindingNonceHex,
    );
    if (recomputed !== recordedCommitment) {
      return {
        valid: false,
        verifiedDisclosedAttributes: [],
        hiddenAttributes: [],
        reason: `Commitment opening mismatch for attribute '${opening.attribute}'.`,
      };
    }
    verifiedDisclosed.push(opening.attribute);
  }

  // 3. Check required disclosed attributes
  if (options?.requiredDisclosedAttributes) {
    for (const reqAttr of options.requiredDisclosedAttributes) {
      if (!verifiedDisclosed.includes(reqAttr)) {
        return {
          valid: false,
          verifiedDisclosedAttributes: verifiedDisclosed,
          hiddenAttributes: [],
          reason: `Required disclosed attribute '${reqAttr}' was not opened in proof.`,
        };
      }
    }
  }

  // 4. Recompute attribute Merkle root from commitments
  const recomputedMerkle = computeCommitmentsMerkleRoot(
    proof.attributeCommitments,
  );
  if (recomputedMerkle !== proof.attributeMerkleRoot) {
    return {
      valid: false,
      verifiedDisclosedAttributes: verifiedDisclosed,
      hiddenAttributes: [],
      reason: `Attribute Merkle root mismatch: expected ${recomputedMerkle}, got ${proof.attributeMerkleRoot}`,
    };
  }

  // 5. Verify overall proof digest
  const expectedDigest = computeProofDigest(
    proof.policySetHash,
    proof.attributeMerkleRoot,
    proof.decision,
  );
  if (expectedDigest !== proof.proofDigest) {
    return {
      valid: false,
      verifiedDisclosedAttributes: verifiedDisclosed,
      hiddenAttributes: [],
      reason: `Proof digest mismatch: expected ${expectedDigest}, got ${proof.proofDigest}`,
    };
  }

  const hiddenAttributes = ORDERED_ATTRIBUTE_KEYS.filter(
    (k) => !verifiedDisclosed.includes(k),
  );

  return {
    valid: true,
    verifiedDisclosedAttributes: verifiedDisclosed,
    hiddenAttributes,
  };
}
