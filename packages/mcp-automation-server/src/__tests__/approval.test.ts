import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ApprovalStore } from "../approval/approval-store.js";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const rowsByToken = new Map<string, Record<string, unknown>>();

vi.mock("better-sqlite3", () => {
  const transactionFn = vi.fn().mockImplementation((fn: () => void) => {
    const wrappedFn = () => fn();
    return wrappedFn;
  });

  const mockDb = {
    exec: vi.fn(),
    prepare: vi.fn().mockImplementation((sql: string) => {
      return {
        run: vi.fn().mockImplementation((...args: unknown[]) => {
          if (sql.includes("INSERT INTO pending_approvals")) {
            const token = String(args[0]);
            rowsByToken.set(token, {
              token,
              toolName: args[1],
              payloadHash: args[2],
              expiresAt: args[3],
              metadata: args[4],
              requesterIdentity: args[5],
              status: args[6],
              requestId: args[7],
              capabilityId: args[8],
              riskLevel: args[9],
              sideEffectLevel: args[10],
              requestedBy: args[11],
              createdAt: args[12],
              auditEventIds: args[13],
            });
          } else if (
            sql.includes("UPDATE pending_approvals SET status = 'APPROVED'")
          ) {
            const token = String(args[1]);
            const existing = rowsByToken.get(token);
            if (existing) {
              existing.status = "APPROVED";
              existing.approvedBy = args[0];
            }
          } else if (
            sql.includes("UPDATE pending_approvals SET status = 'CONSUMED'")
          ) {
            const token = String(args[1]);
            const existing = rowsByToken.get(token);
            if (existing) {
              existing.status = "CONSUMED";
              existing.consumedAt = args[0];
            }
          }
        }),
        get: vi.fn().mockImplementation((...args: unknown[]) => {
          if (sql.includes("PRAGMA user_version")) {
            return { user_version: 0 };
          }
          if (sql.includes("SELECT * FROM pending_approvals WHERE token =")) {
            const token = String(args[0]);
            const row = rowsByToken.get(token);
            if (!row) return undefined;
            if (
              sql.includes("status = 'PENDING'") &&
              row.status !== "PENDING"
            ) {
              return undefined;
            }
            return row;
          }
          return undefined;
        }),
        all: vi.fn().mockReturnValue([]),
      };
    }),
    transaction: transactionFn,
  };
  return {
    default: vi.fn().mockImplementation(() => mockDb),
  };
});

function hashPayload(payload: any): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

describe("Approval Store Security", () => {
  let store: ApprovalStore;
  let testDbPath: string;

  beforeEach(() => {
    rowsByToken.clear();
    // We use a specific temp DB path to avoid polluting real dbs
    testDbPath = path.join(__dirname, "test-approvals.db");
    process.env["AKCP_DB_PATH"] = testDbPath;
    store = new ApprovalStore();
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("should generate a secure token and bind it to a payload hash", async () => {
    const payload = { action: "deploy", target: "production" };

    const token = store.generateToken(
      "req-1",
      "deploy_service",
      hashPayload(payload),
      "high",
      "external-write",
      "agent",
    );

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
  });

  it("should fail validation if the execution payload does not match the approved payload", async () => {
    const originalPayload = { action: "refund", amount: 10 };
    const maliciousPayload = { action: "refund", amount: 1000 };

    const originalHash = hashPayload(originalPayload);
    const token = store.generateToken(
      "req-2",
      "issue_refund",
      originalHash,
      "critical",
      "external-write",
      "agent",
    );

    const approved = store.approveToken(token, "human-approver");
    expect(approved).toBe(true);

    const maliciousHash = hashPayload(maliciousPayload);
    expect(maliciousHash).not.toBe(originalHash);
    const valid = store.validateAndConsume(
      token,
      "issue_refund",
      maliciousHash,
      "human-approver",
    );
    expect(valid).toBe(false);
  });

  it("should drop or mark token consumed upon execution (replay prevention)", async () => {
    const payload = { test: 123 };
    const payloadHash = hashPayload(payload);
    const token = store.generateToken(
      "req-3",
      "test_tool",
      payloadHash,
      "low",
      "none",
      "agent",
    );

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(store.approveToken(token, "human-approver")).toBe(true);
    expect(store.approveToken(token, "human-approver")).toBe(false);
  });

  it("should reject validateAndConsume on an already-consumed token", () => {
    const payload = { ticketId: "TKT-900", action: "refund" };
    const payloadHash = hashPayload(payload);
    const token = store.generateToken(
      "req-4",
      "record_support_resolution",
      payloadHash,
      "critical",
      "external-submit",
      "support-agent",
    );

    expect(store.approveToken(token, "supervisor@corp.com")).toBe(true);

    const firstConsume = store.validateAndConsume(
      token,
      "record_support_resolution",
      payloadHash,
      "supervisor@corp.com",
    );
    expect(firstConsume).toBe(true);

    const replayConsume = store.validateAndConsume(
      token,
      "record_support_resolution",
      payloadHash,
      "supervisor@corp.com",
    );
    expect(replayConsume).toBe(false);
  });
});
