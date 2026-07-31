import crypto from "crypto";
import { Redis } from "ioredis";
import type { IApprovalStore, PendingApproval, AuditLog } from "./types.js";

export class RedisApprovalStore implements IApprovalStore {
  private redis: Redis;
  private prefix = "akcp:approval:";
  private indexKey: string;
  private auditStreamKey: string;

  constructor(redisUrl?: string) {
    this.redis = new Redis(
      redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
    );
    this.indexKey = `${this.prefix}pending:index`;
    this.auditStreamKey = `${this.prefix}audit_stream`;
  }

  async generateToken(
    requestId: string,
    capabilityId: string,
    payloadHash: string,
    riskLevel: string,
    sideEffectLevel: string,
    requestedBy: string,
    metadata?: Record<string, unknown>,
    ttlMs = 15 * 60 * 1000,
  ): Promise<string> {
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

    // Store with TTL, and index the token so getPendingApprovals() doesn't need
    // a cluster-wide SCAN. Awaited (not fire-and-forget) so the token is durable
    // before the caller can hand it to anyone for approval.
    await this.redis.setex(
      `${this.prefix}pending:${token}`,
      Math.floor(ttlMs / 1000),
      JSON.stringify(record),
    );
    await this.redis.sadd(this.indexKey, token);

    return token;
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    const tokens = await this.redis.smembers(this.indexKey);
    if (tokens.length === 0) return [];

    const keys = tokens.map((t) => `${this.prefix}pending:${t}`);
    const values = await this.redis.mget(...keys);

    const pending: PendingApproval[] = [];
    const staleTokens: string[] = [];

    values.forEach((data, i) => {
      const token = tokens[i]!;
      if (!data) {
        // Record expired/consumed/revoked (key gone) but the index entry wasn't
        // cleaned up yet — self-heal by dropping it from the index.
        staleTokens.push(token);
        return;
      }
      const record: PendingApproval = JSON.parse(data);
      if (record.status === "PENDING") {
        pending.push(record);
      } else {
        staleTokens.push(token);
      }
    });

    if (staleTokens.length > 0) {
      await this.redis.srem(this.indexKey, ...staleTokens);
    }

    return pending;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    // Read the most recent `limit` entries from the audit stream written by
    // logAudit(). Not a substitute for a persistent sink (Kafka/Postgres) in a
    // long-lived production deployment, but no longer a stub returning [].
    const entries = await this.redis.xrevrange(
      this.auditStreamKey,
      "+",
      "-",
      "COUNT",
      limit,
    );
    return entries.map(([, fields]) => {
      const eventIdx = fields.indexOf("event");
      const raw = eventIdx >= 0 ? fields[eventIdx + 1] : undefined;
      return raw ? (JSON.parse(raw) as AuditLog) : ({} as AuditLog);
    });
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

    // DEL's return count is the consumption guard: if two callers race past the
    // checks above, only one DEL removes the key (returns 1) and consumes the
    // token — the other's DEL returns 0 and is correctly rejected below.
    const deleted = await this.redis.del(key);
    await this.redis.srem(this.indexKey, token);
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
      await this.redis.srem(this.indexKey, token);
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
    // Fire-and-forget is acceptable here: audit logging must not block/fail the
    // approval decision path itself, but surface stream write failures instead
    // of swallowing them silently.
    this.redis
      .xadd(this.auditStreamKey, "*", "event", JSON.stringify(log))
      .catch((err) =>
        console.error("[RedisApprovalStore] Failed to write audit log", err),
      );
  }
}
