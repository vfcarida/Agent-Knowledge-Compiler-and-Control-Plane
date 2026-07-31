import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisApprovalStore } from "../redis-store.js";

vi.mock("ioredis", () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      let data: Record<string, string> = {};
      let sets: Record<string, Set<string>> = {};
      let streams: Record<string, Array<[string, string[]]>> = {};
      let streamSeq = 0;

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
        mget: vi.fn().mockImplementation(async (...keys: string[]) => {
          return keys.map((key) => data[key] || null);
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
        sadd: vi
          .fn()
          .mockImplementation(async (key: string, ...members: string[]) => {
            const set = sets[key] || (sets[key] = new Set());
            let added = 0;
            for (const m of members) {
              if (!set.has(m)) {
                set.add(m);
                added++;
              }
            }
            return added;
          }),
        srem: vi
          .fn()
          .mockImplementation(async (key: string, ...members: string[]) => {
            const set = sets[key];
            if (!set) return 0;
            let removed = 0;
            for (const m of members) {
              if (set.delete(m)) removed++;
            }
            return removed;
          }),
        smembers: vi.fn().mockImplementation(async (key: string) => {
          return [...(sets[key] || [])];
        }),
        xadd: vi
          .fn()
          .mockImplementation(
            async (key: string, _id: string, ...fields: string[]) => {
              const id = `${Date.now()}-${streamSeq++}`;
              (streams[key] || (streams[key] = [])).push([id, fields]);
              return id;
            },
          ),
        xrevrange: vi
          .fn()
          .mockImplementation(
            async (
              key: string,
              _end: string,
              _start: string,
              _countKw: string,
              count: number,
            ) => {
              const entries = streams[key] || [];
              return [...entries].reverse().slice(0, count);
            },
          ),
        setex: vi.fn().mockImplementation(async (key, _seconds, val) => {
          data[key] = val;
          return "OK";
        }),
        ttl: vi.fn().mockImplementation(async (_key) => {
          return 3600;
        }),
        _reset: () => {
          data = {};
          sets = {};
          streams = {};
          streamSeq = 0;
        },
      };
    }),
  };
});

describe("RedisApprovalStore", () => {
  let store: RedisApprovalStore;

  let clientMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RedisApprovalStore();

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

  it("returns an empty list when there are no pending approvals", async () => {
    const pending = await store.getPendingApprovals();
    expect(pending.length).toBe(0);
  });

  it("lists a real pending approval via the secondary index (no longer a stub)", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );

    const pending = await store.getPendingApprovals();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.token).toBe(token);
    expect(pending[0]?.status).toBe("PENDING");
  });

  it("self-heals the index when a record expired/was removed without going through this store's own methods", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    // Simulate a TTL expiry: the key disappears from the underlying store, but the
    // index still references the token until getPendingApprovals() cleans it up.
    await clientMock.del(`akcp:approval:pending:${token}`);

    const pending = await store.getPendingApprovals();
    expect(pending).toHaveLength(0);

    const indexMembers = await clientMock.smembers(
      "akcp:approval:pending:index",
    );
    expect(indexMembers).not.toContain(token);
  });

  it("removes the token from the index once consumed", async () => {
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
    await store.validateAndConsume(token, "action-1", "hash-1", "user-1");

    const indexMembers = await clientMock.smembers(
      "akcp:approval:pending:index",
    );
    expect(indexMembers).not.toContain(token);
  });

  it("removes the token from the index once revoked", async () => {
    const token = await store.generateToken(
      "req-1",
      "action-1",
      "hash-1",
      "high",
      "write",
      "agent-1",
      {},
    );
    await store.revokeToken(token, "user-1");

    const indexMembers = await clientMock.smembers(
      "akcp:approval:pending:index",
    );
    expect(indexMembers).not.toContain(token);
  });

  it("returns an empty list when there are no audit logs", async () => {
    const logs = await store.getAuditLogs();
    expect(logs.length).toBe(0);
  });

  it("reads real audit log entries back from the stream (no longer a stub)", async () => {
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
    await store.validateAndConsume(token, "action-1", "hash-1", "user-1");

    const logs = await store.getAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.action === "APPROVED")).toBe(true);
  });
});
