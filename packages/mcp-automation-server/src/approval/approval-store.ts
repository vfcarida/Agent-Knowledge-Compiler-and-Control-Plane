import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations.js';

export interface ApprovalPayload {
  toolName: string;
  payloadHash: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export interface PendingApproval {
  token: string;
  toolName: string;
  payloadHash: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
  requesterIdentity?: string;
}

export class ApprovalStore {
  private db: Database.Database;

  constructor() {
    const defaultDbDir = path.resolve(process.env['OCF_BUNDLE_PATH'] || './sample-data/.okf');
    if (!fs.existsSync(defaultDbDir)) {
      fs.mkdirSync(defaultDbDir, { recursive: true });
    }
    
    const dbPath = process.env['OCF_DB_PATH'] || path.join(defaultDbDir, 'approvals.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    runMigrations(this.db);
  }

  generateToken(toolName: string, payload: unknown, metadata?: Record<string, unknown>, requesterIdentity?: string, ttlMs = 15 * 60 * 1000): string {
    const token = crypto.randomBytes(32).toString('hex');
    const payloadHash = this.hashPayload(payload);
    const expiresAt = Date.now() + ttlMs;
    const metaStr = metadata ? JSON.stringify(metadata) : null;
    const reqId = requesterIdentity || null;

    const stmt = this.db.prepare(
      `INSERT INTO pending_approvals (token, toolName, payloadHash, expiresAt, metadata, requesterIdentity) VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(token, toolName, payloadHash, expiresAt, metaStr, reqId);
    
    return token;
  }

  getPendingApprovals(): PendingApproval[] {
    const now = Date.now();
    // Clean up expired
    this.db.prepare(`DELETE FROM pending_approvals WHERE expiresAt < ?`).run(now);

    const stmt = this.db.prepare(`SELECT * FROM pending_approvals`);
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      token: row.token,
      toolName: row.toolName,
      payloadHash: row.payloadHash,
      expiresAt: row.expiresAt,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      requesterIdentity: row.requesterIdentity
    }));
  }

  getAuditLogs(limit = 100): any[] {
    const stmt = this.db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`);
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  validateAndConsume(token: string, toolName: string, payload: unknown, actorIdentity?: string): boolean {
    const now = Date.now();
    
    // Cleanup first
    this.db.prepare(`DELETE FROM pending_approvals WHERE expiresAt < ?`).run(now);

    const stmt = this.db.prepare(`SELECT * FROM pending_approvals WHERE token = ?`);
    const record = stmt.get(token) as any;

    if (!record) {
      this.logAudit('REJECTED_NOT_FOUND', toolName, this.hashPayload(payload), undefined, actorIdentity);
      return false;
    }
    
    // Check tool match
    if (record.toolName !== toolName) {
      this.logAudit('REJECTED_TOOL_MISMATCH', toolName, this.hashPayload(payload), record.metadata, actorIdentity);
      return false;
    }
    
    // Check payload hash match
    const payloadHash = this.hashPayload(payload);
    if (record.payloadHash !== payloadHash) {
      this.logAudit('REJECTED_HASH_MISMATCH', toolName, payloadHash, record.metadata, actorIdentity);
      return false;
    }
    
    // Consume token (One-time use)
    this.db.prepare(`DELETE FROM pending_approvals WHERE token = ?`).run(token);
    this.logAudit('APPROVED', toolName, payloadHash, record.metadata, actorIdentity);
    return true;
  }

  revokeToken(token: string, actorIdentity?: string): boolean {
    const stmt = this.db.prepare(`SELECT * FROM pending_approvals WHERE token = ?`);
    const record = stmt.get(token) as any;
    
    if (record) {
      this.db.prepare(`DELETE FROM pending_approvals WHERE token = ?`).run(token);
      this.logAudit('REVOKED', record.toolName, record.payloadHash, record.metadata, actorIdentity);
      return true;
    }
    return false;
  }

  private logAudit(action: string, toolName: string, payloadHash: string, metadata?: string, actorIdentity?: string) {
    const stmt = this.db.prepare(
      `INSERT INTO audit_logs (timestamp, action, toolName, payloadHash, metadata, actorIdentity) VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(Date.now(), action, toolName, payloadHash, metadata || null, actorIdentity || null);
  }

  private hashPayload(payload: unknown): string {
    const data = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
