import crypto from "crypto";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrations.js";

import type { IApprovalStore, PendingApproval } from "./types.js";

export class ApprovalStore implements IApprovalStore {
  private db: Database.Database;

  constructor() {
    const defaultDbDir = path.resolve(
      process.env["AKCP_BUNDLE_PATH"] || "./packages/test-fixtures/sample-data/.okf",
    );
    if (!fs.existsSync(defaultDbDir)) {
      fs.mkdirSync(defaultDbDir, { recursive: true });
    }

    const dbPath =
      process.env["AKCP_DB_PATH"] || path.join(defaultDbDir, "approvals.db");
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    runMigrations(this.db);
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
    const createdAt = Date.now();
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    const stmt = this.db.prepare(
      `INSERT INTO pending_approvals (token, toolName, payloadHash, expiresAt, metadata, requesterIdentity, status, requestId, capabilityId, riskLevel, sideEffectLevel, requestedBy, createdAt, auditEventIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      token,
      capabilityId, // Map to legacy toolName for now
      payloadHash,
      expiresAt,
      metaStr,
      requestedBy, // Map to legacy requesterIdentity
      "PENDING",
      requestId,
      capabilityId,
      riskLevel,
      sideEffectLevel,
      requestedBy,
      createdAt,
      "[]"
    );

    return token;
  }

  getPendingApprovals(): PendingApproval[] {
    const now = Date.now();
    // Clean up expired
    this.db
      .prepare(`DELETE FROM pending_approvals WHERE expiresAt < ?`)
      .run(now);

    const stmt = this.db.prepare(
      `SELECT * FROM pending_approvals WHERE status = 'PENDING'`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      token: row.token,
      requestId: row.requestId,
      capabilityId: row.capabilityId || row.toolName,
      payloadHash: row.payloadHash,
      riskLevel: row.riskLevel,
      sideEffectLevel: row.sideEffectLevel,
      requestedBy: row.requestedBy || row.requesterIdentity,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      auditEventIds: row.auditEventIds ? JSON.parse(row.auditEventIds) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuditLogs(limit = 100): any[] {
    const stmt = this.db.prepare(
      `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  validateAndConsume(
    token: string,
    capabilityId: string,
    payloadHash: string,
    actorIdentity?: string,
  ): boolean {
    const now = Date.now();

    // Cleanup first
    this.db
      .prepare(`DELETE FROM pending_approvals WHERE expiresAt < ?`)
      .run(now);

    const stmt = this.db.prepare(
      `SELECT * FROM pending_approvals WHERE token = ?`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = stmt.get(token) as any;

    if (!record) {
      this.logAudit(
        "REJECTED_NOT_FOUND",
        capabilityId,
        payloadHash,
        undefined,
        actorIdentity,
      );
      return false;
    }

    // Check tool match
    if (record.capabilityId !== capabilityId && record.toolName !== capabilityId) {
      this.logAudit(
        "REJECTED_TOOL_MISMATCH",
        capabilityId,
        payloadHash,
        record.metadata,
        actorIdentity,
      );
      return false;
    }

    // Check payload hash match
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

    // Check status
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

    // Consume token (One-time use)
    this.db.prepare(`UPDATE pending_approvals SET status = 'CONSUMED', consumedAt = ? WHERE token = ?`).run(Date.now(), token);
    this.logAudit(
      "CONSUMED",
      capabilityId,
      payloadHash,
      record.metadata,
      actorIdentity,
    );
    return true;
  }

  approveToken(token: string, actorIdentity?: string): boolean {
    const stmt = this.db.prepare(
      `SELECT * FROM pending_approvals WHERE token = ? AND status = 'PENDING'`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = stmt.get(token) as any;

    if (record) {
      this.db
        .prepare(
          `UPDATE pending_approvals SET status = 'APPROVED', approvedBy = ? WHERE token = ?`,
        )
        .run(actorIdentity || null, token);
      this.logAudit(
        "APPROVED",
        record.capabilityId || record.toolName,
        record.payloadHash,
        record.metadata,
        actorIdentity,
      );
      return true;
    }
    return false;
  }

  revokeToken(token: string, actorIdentity?: string): boolean {
    const stmt = this.db.prepare(
      `SELECT * FROM pending_approvals WHERE token = ? AND status = 'PENDING'`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = stmt.get(token) as any;

    if (record) {
      this.db
        .prepare(
          `UPDATE pending_approvals SET status = 'REVOKED' WHERE token = ?`,
        )
        .run(token);
      this.logAudit(
        "REVOKED",
        record.capabilityId || record.toolName,
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
    metadata?: string,
    actorIdentity?: string,
  ) {
    const stmt = this.db.prepare(
      `INSERT INTO audit_logs (timestamp, action, toolName, payloadHash, metadata, actorIdentity) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      Date.now(),
      action,
      toolName,
      payloadHash,
      metadata || null,
      actorIdentity || null,
    );
  }

}
