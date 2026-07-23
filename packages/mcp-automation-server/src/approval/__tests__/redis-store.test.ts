import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisApprovalStore } from "../redis-store.js";

vi.mock("ioredis", () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      let data: Record<string, string> = {};
      return {
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(true),
        disconnect: vi.fn().mockResolvedValue(true),
        set: vi.fn().mockImplementation(async (key, val, _opts) => {
          data[key] = val;
          return "OK";
        }),
        get: vi.fn().mockImplementation(async (key) => {
          return data[key] || null;
        }),
        keys: vi.fn().mockImplementation(async () => {
          return Object.keys(data);
        }),
        del: vi.fn().mockImplementation(async (key) => {
          if (data[key]) {
            delete data[key];
            return 1;
          }
          return 0;
        }),
        xadd: vi.fn().mockImplementation(async () => {
          return "1-0";
        }),
        setex: vi.fn().mockImplementation(async (key, _seconds, val) => {
          data[key] = val;
          return "OK";
        }),
        ttl: vi.fn().mockImplementation(async (_key) => {
          return 3600;
        }),
        _reset: () => {
          data = {};
        },
      };
    }),
  };
});

describe("RedisApprovalStore", () => {
  let store: RedisApprovalStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RedisApprovalStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientMock = (store as any).redis;
    clientMock._reset();
  });

  it("should generate a secure token", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    expect(token).toBeDefined();
    expect(token).toHaveLength(64); // crypto.randomBytes(32).toString("hex")

    const savedStr = await clientMock.get(`akcp:approval:pending:${token}`);
    expect(savedStr).toBeDefined();

    const saved = JSON.parse(savedStr);
    expect(saved.requestId).toBe("req-1");
    expect(saved.status).toBe("PENDING");
  });

  it("should validate and consume a valid token", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );

    // First, approve the token
    const approved = await store.approveToken(token, "user-1");
    expect(approved).toBe(true);

    // Then consume it
    const isValid = await store.validateAndConsume(
      token,
      "action-1",
      "hash-1",
      "user-1",
    );
    expect(isValid).toBe(true);

    const consumedStr = await clientMock.get(`akcp:approval:pending:${token}`);
    expect(consumedStr).toBeNull();
  });

  it("should fail validation if action mismatch", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    await store.approveToken(token, "user-1");
    const isValid = await store.validateAndConsume(
      token,
      "wrong-action",
      "hash-1",
      "user-1",
    );
    expect(isValid).toBe(false);
  });

  it("should fail validation if token is not approved", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    const isValid = await store.validateAndConsume(
      token,
      "action-1",
      "hash-1",
      "user-1",
    );
    expect(isValid).toBe(false);
  });

  it("should revoke a token", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    const revoked = await store.revokeToken(token, "user-1");
    expect(revoked).toBe(true);

    const savedStr = await clientMock.get(`akcp:approval:pending:${token}`);
    expect(savedStr).toBeNull();
  });

  it("should return empty pending approvals", async () => {
    // getPendingApprovals is a stub that returns []
    const pending = await store.getPendingApprovals();
    expect(pending.length).toBe(0);
  });

  it("should return empty audit logs", () => {
    const logs = store.getAuditLogs();
    expect(logs.length).toBe(0);
  });
});
