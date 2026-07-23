import { describe, it, expect } from "vitest";
import { authenticate, hashApiKey, generateApiKey } from "../../capabilities/auth.js";
import type { AuthConfig } from "../../capabilities/auth.js";

describe("Authentication", () => {
  const testKey = "akcp_test123456";
  const testKeyHash = hashApiKey(testKey);

  const config: AuthConfig = {
    requireAuth: true,
    credentials: [
      {
        agentId: "agent-1",
        apiKey: testKeyHash,
        scopes: ["akcp.read_*", "akcp.list_*"],
        createdAt: new Date().toISOString(),
      },
      {
        agentId: "agent-2",
        apiKey: hashApiKey("akcp_agent2key"),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
      },
    ],
  };

  it("should authenticate valid API key", () => {
    const result = authenticate(testKey, config);
    expect(result.authenticated).toBe(true);
    expect(result.agentId).toBe("agent-1");
  });

  it("should reject missing API key", () => {
    const result = authenticate(undefined, config);
    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("No API key");
  });

  it("should reject invalid API key", () => {
    const result = authenticate("akcp_wrong", config);
    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("Invalid");
  });

  it("should reject expired API key", () => {
    const result = authenticate("akcp_agent2key", config);
    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("should skip auth when requireAuth is false", () => {
    const devConfig: AuthConfig = { requireAuth: false, credentials: [] };
    const result = authenticate(undefined, devConfig);
    expect(result.authenticated).toBe(true);
    expect(result.agentId).toBe("anonymous");
  });

  it("should return scopes from credential", () => {
    const result = authenticate(testKey, config);
    expect(result.scopes).toEqual(["akcp.read_*", "akcp.list_*"]);
  });

  it("generateApiKey should produce valid key pair", () => {
    const { plain, hashed } = generateApiKey();
    expect(plain).toMatch(/^akcp_[a-f0-9]{48}$/);
    expect(hashed).toHaveLength(64); // SHA-256 hex
    expect(hashApiKey(plain)).toBe(hashed);
  });
});

describe("Brute-force protection", () => {
  it("should block after 5 failed attempts", () => {
    const config: AuthConfig = {
      requireAuth: true,
      credentials: [
        { agentId: "agent-1", apiKey: hashApiKey("valid_key"), createdAt: new Date().toISOString() },
      ],
    };

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const result = authenticate("wrong_key", config, { sourceId: "attacker-ip" });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("Invalid");
    }

    // 6th attempt should be rate limited
    const blocked = authenticate("wrong_key", config, { sourceId: "attacker-ip" });
    expect(blocked.authenticated).toBe(false);
    expect(blocked.reason).toContain("Too many");
  });

  it("should not affect other sources", () => {
    const config: AuthConfig = {
      requireAuth: true,
      credentials: [
        { agentId: "agent-1", apiKey: hashApiKey("valid_key"), createdAt: new Date().toISOString() },
      ],
    };

    // Exhaust one source
    for (let i = 0; i < 5; i++) {
      authenticate("wrong", config, { sourceId: "attacker" });
    }

    // Another source should still work
    const result = authenticate("valid_key", config, { sourceId: "legit-user" });
    expect(result.authenticated).toBe(true);
  });

  it("should reset on successful auth", () => {
    const config: AuthConfig = {
      requireAuth: true,
      credentials: [
        { agentId: "agent-1", apiKey: hashApiKey("valid_key"), createdAt: new Date().toISOString() },
      ],
    };

    // 4 failed attempts (not yet blocked)
    for (let i = 0; i < 4; i++) {
      authenticate("wrong", config, { sourceId: "user-1" });
    }

    // Successful auth resets the counter
    authenticate("valid_key", config, { sourceId: "user-1" });

    // Should be able to make more attempts now
    const result = authenticate("wrong", config, { sourceId: "user-1" });
    expect(result.reason).not.toContain("Too many");
  });
});
