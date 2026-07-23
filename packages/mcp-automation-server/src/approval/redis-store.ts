import crypto from "crypto";
import { Redis } from "ioredis";
import type { IApprovalStore, PendingApproval, AuditLog } from "./types.js";

export class RedisApprovalStore implements IApprovalStore {
  private redis: Redis;
  private prefix = "akcp:approval:";

  constructor(redisUrl?: string) {
    this.redis = new Redis(
      redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
    );
  }

  generateToken(
    requestId: string,
    capabilityId: string,
    payloadHash: string,
    riskLevel: string,
    sideEffectLevel: string,
    requestedBy: string,
    metadata?: Record<string, unknown>,
    ttlMs = 15 * 60 * 1000,
  ): string {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + ttlMs;

    const record: PendingApproval = {
      token,
      requestId,
      capabilityId,
      payloadHash,
      riskLevel,
      sideEffectLevel,
      requestedBy,
      createdAt: Date.now(),
      expiresAt,
      metadata,
      status: "PENDING",
      auditEventIds: [],
    };

    // Store with TTL
    this.redis.setex(
      `${this.prefix}pending:${token}`,
      Math.floor(ttlMs / 1000),
      JSON.stringify(record),
    );

    return token;
  }

  getPendingApprovals(): PendingApproval[] {
    // Note: In a real enterprise setup, we'd use HSCAN or maintain an index of pending approvals
    // For this interface parity, we will just return empty or require a different query pattern
    // because SCAN can be slow on large clusters.
    // As a stub for compatibility, we return empty unless we scan (omitted here for performance).
    console.warn(
      "[RedisApprovalStore] getPendingApprovals requires a secondary index (not fully implemented in Redis adapter)",
    );
    return [];
  }

  getAuditLogs(_limit = 100): AuditLog[] {
    // Stub: Redis is not a good persistent audit log. Usually we would stream this to Kafka or Postgres.
    console.warn(
      "[RedisApprovalStore] getAuditLogs should query a persistent sink, not Redis.",
    );
    return [];
  }

  async validateAndConsume(
    token: string,
    capabilityId: string,
    payloadHash: string,
    actorIdentity?: string,
  ): Promise<boolean> {
    const key = `${this.prefix}pending:${token}`;
    const data = await this.redis.get(key);

    if (!data) {
      this.logAudit(
        "REJECTED_NOT_FOUND",
        capabilityId,
        payloadHash,
        undefined,
        actorIdentity,
      );
      return false;
    }

    const record: PendingApproval = JSON.parse(data);

    if (record.capabilityId !== capabilityId) {
      this.logAudit(
        "REJECTED_TOOL_MISMATCH",
        capabilityId,
        payloadHash,
        record.metadata,
        actorIdentity,
      );
      return false;
    }

    if (record.status !== "APPROVED") {
      this.logAudit(
        "REJECTED_NOT_APPROVED",
        capabilityId,
        payloadHash,
        record.metadata,
        actorIdentity,
      );
      return false;
    }

    if (record.payloadHash !== payloadHash) {
      this.logAudit(
        "REJECTED_HASH_MISMATCH",
        capabilityId,
        payloadHash,
        record.metadata,
        actorIdentity,
      );
      return false;
    }

    // Atomic delete to consume
    const deleted = await this.redis.del(key);
    if (deleted > 0) {
      this.logAudit(
        "APPROVED",
        capabilityId,
        payloadHash,
        record.metadata,
        actorIdentity,
      );
      return true;
    }

    return false;
  }

  async approveToken(token: string, actorIdentity?: string): Promise<boolean> {
    const key = `${this.prefix}pending:${token}`;
    const data = await this.redis.get(key);

    if (data) {
      const record: PendingApproval = JSON.parse(data);
      if (record.status === "PENDING") {
        record.status = "APPROVED";
        record.approvedBy = actorIdentity;
        // Compute remaining TTL
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.setex(key, ttl, JSON.stringify(record));
        } else {
          await this.redis.set(key, JSON.stringify(record));
        }
        this.logAudit(
          "APPROVED",
          record.capabilityId,
          record.payloadHash,
          record.metadata,
          actorIdentity,
        );
        return true;
      }
    }
    return false;
  }

  async revokeToken(token: string, actorIdentity?: string): Promise<boolean> {
    const key = `${this.prefix}pending:${token}`;
    const data = await this.redis.get(key);

    if (data) {
      const record: PendingApproval = JSON.parse(data);
      await this.redis.del(key);
      this.logAudit(
        "REVOKED",
        record.capabilityId,
        record.payloadHash,
        record.metadata,
        actorIdentity,
      );
      return true;
    }
    return false;
  }

  private logAudit(
    action: string,
    toolName: string,
    payloadHash: string,
    metadata?: Record<string, unknown>,
    actorIdentity?: string,
  ) {
    const log: AuditLog = {
      timestamp: Date.now(),
      action,
      toolName,
      payloadHash,
      metadata,
      actorIdentity,
    };
    // Emit event or stream
    this.redis.xadd(
      `${this.prefix}audit_stream`,
      "*",
      "event",
      JSON.stringify(log),
    );
  }
}
