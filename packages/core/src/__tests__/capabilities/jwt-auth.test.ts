import { describe, it, expect } from "vitest";
import { signJwtToken, verifyJwtToken } from "../../capabilities/jwt-auth.js";
import { authenticate, type AuthConfig } from "../../capabilities/auth.js";
import { generateSigningKeyPair } from "../../provenance/sign.js";
import { computeWatchImpactPlan } from "../../compiler/watch-planner.js";
import type { OKFDocument } from "../../domain/types.js";

describe("JWT / OIDC Capability Authentication & Watch Impact Planner", () => {
  const secret = "enterprise-hmac-secret-key-2026";

  it("signs and verifies HS256 JWT tokens with sub, scopes, and roles", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtToken(
      {
        sub: "agent-finops-01",
        iss: "https://auth.akcp.dev",
        aud: "akcp-gateway",
        exp: now + 3600,
        scope: "read_document list_documents",
        roles: ["auditor", "operator"],
      },
      { secret, algorithm: "HS256" },
    );

    const res = verifyJwtToken(token, {
      secret,
      issuer: "https://auth.akcp.dev",
      audience: "akcp-gateway",
    });

    expect(res.valid).toBe(true);
    expect(res.agentId).toBe("agent-finops-01");
    expect(res.scopes).toEqual(["read_document", "list_documents"]);
    expect(res.roles).toEqual(["auditor", "operator"]);
  });

  it("signs and verifies EdDSA (Ed25519) asymmetric JWT tokens", () => {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtToken(
      {
        sub: "agent-ed25519",
        exp: now + 600,
        scopes: ["mcp:*"],
      },
      { privateKeyPem, algorithm: "EdDSA" },
    );

    const verified = verifyJwtToken(`Bearer ${token}`, { publicKeyPem });
    expect(verified.valid).toBe(true);
    expect(verified.agentId).toBe("agent-ed25519");
    expect(verified.scopes).toEqual(["mcp:*"]);
  });

  it("rejects expired or tampered JWT tokens", () => {
    const past = Math.floor(Date.now() / 1000) - 120;
    const expiredToken = signJwtToken(
      { sub: "agent-expired", exp: past },
      { secret },
    );
    const expRes = verifyJwtToken(expiredToken, { secret });
    expect(expRes.valid).toBe(false);
    expect(expRes.reason).toContain("expired");

    const badSigRes = verifyJwtToken(expiredToken, { secret: "wrong-secret" });
    expect(badSigRes.valid).toBe(false);
    expect(badSigRes.reason).toContain("Invalid JWT HMAC signature");
  });

  it("integrates JWT bearer verification directly into authenticate()", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtToken(
      { sub: "oidc-agent", exp: now + 300, scope: "classify_support_intent" },
      { secret },
    );

    const authConfig: AuthConfig = {
      requireAuth: true,
      credentials: [],
      jwt: { secret },
    };

    const result = authenticate(`Bearer ${token}`, authConfig);
    expect(result.authenticated).toBe(true);
    expect(result.agentId).toBe("oidc-agent");
    expect(result.scopes).toEqual(["classify_support_intent"]);
  });

  it("computes incremental watch blast radius from semantic graph dependencies", () => {
    const docs: OKFDocument[] = [
      {
        conceptId: "base-schema",
        filePath: "/workspace/bundle/base-schema.md",
        frontmatter: { type: "Concept", title: "Base Schema" },
        body: "Core schema definition.",
        rawContent: "",
      },
      {
        conceptId: "api-service",
        filePath: "/workspace/bundle/api-service.md",
        frontmatter: {
          type: "Runbook",
          title: "API Service",
          depends_on: ["base-schema"],
        },
        body: "Uses [[base-schema]].",
        rawContent: "",
      },
    ];

    const plan = computeWatchImpactPlan(
      "/workspace/bundle/base-schema.md",
      docs,
      ["context-pack", "policy-bundle", "hybrid-index"],
    );

    expect(plan.requiresFullRebuild).toBe(false);
    expect(plan.matchedConceptId).toBe("base-schema");
    expect(plan.impactedConceptIds).toContain("base-schema");
    expect(plan.impactedConceptIds).toContain("api-service");
    expect(plan.affectedTargetTypes).toEqual(["context-pack", "hybrid-index"]);
  });
});
