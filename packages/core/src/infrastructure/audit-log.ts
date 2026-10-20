export type AuditEventAction =
  | "capability.invoke"
  | "policy.evaluate"
  | "approval.request"
  | "approval.consume"
  | "approval.expire"
  | "system.error"
  | "rate_limit.exceeded"
  | "auth.failed";
export type AuditEventDecision =
  | "allow"
  | "deny"
  | "require_approval"
  | "error"
  | "pending"
  | "consumed"
  | "expired";
export type AuditRiskLevel = "low" | "medium" | "high" | "critical";

export interface AuditEvent {
  schemaVersion: "akcp.audit/v1";
  eventId: string;
  timestamp: string;
  sequence?: number;
  prevHash?: string;
  entryHash?: string;
  requestId: string;
  actor: string;
  action: AuditEventAction;
  capabilityId?: string;
  decision: AuditEventDecision;
  riskLevel: AuditRiskLevel;
  evidence: {
    payloadHash?: string;
    policyIds?: string[];
    reason?: string;

    [key: string]: any;
  };
}

export interface AuditLedgerTamperFinding {
  index: number;
  eventId: string;
  reason: "SEQUENCE_MISMATCH" | "PREV_HASH_MISMATCH" | "ENTRY_HASH_MISMATCH";
  expected: string;
  actual: string;
}

export interface AuditLedgerVerificationResult {
  valid: boolean;
  totalEvents: number;
  merkleRoot: string;
  headHash: string;
  findings: AuditLedgerTamperFinding[];
}

export interface IAuditLogService {
  logEvent(
    event: Omit<
      AuditEvent,
      | "schemaVersion"
      | "eventId"
      | "timestamp"
      | "sequence"
      | "prevHash"
      | "entryHash"
    >,
  ): Promise<string>;

  getEvents(limit?: number): Promise<AuditEvent[]>;

  verifyLedger?(): Promise<AuditLedgerVerificationResult>;
}

import fs from "fs";
import path from "path";
import crypto from "crypto";

export const GENESIS_AUDIT_HASH = "0".repeat(64);

function canonicalizeAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeAuditValue(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys
    .filter((k) => record[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalizeAuditValue(record[k])}`);
  return `{${pairs.join(",")}}`;
}

export function computeAuditEntryHash(
  event: Omit<AuditEvent, "entryHash">,
  prevHash: string = event.prevHash ?? GENESIS_AUDIT_HASH,
  sequence: number = event.sequence ?? 0,
): string {
  const canonicalPayload = canonicalizeAuditValue({
    schemaVersion: event.schemaVersion,
    eventId: event.eventId,
    timestamp: event.timestamp,
    sequence,
    prevHash,
    requestId: event.requestId,
    actor: event.actor,
    action: event.action,
    capabilityId: event.capabilityId ?? null,
    decision: event.decision,
    riskLevel: event.riskLevel,
    evidence: event.evidence,
  });
  return crypto
    .createHash("sha256")
    .update(canonicalPayload, "utf8")
    .digest("hex");
}

export function computeAuditMerkleRoot(events: AuditEvent[]): string {
  if (events.length === 0) {
    return GENESIS_AUDIT_HASH;
  }

  let currentLevel = events.map(
    (e, idx) =>
      e.entryHash ??
      computeAuditEntryHash(
        e,
        e.prevHash ?? GENESIS_AUDIT_HASH,
        e.sequence ?? idx,
      ),
  );

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1] ?? left;
      const combined = crypto
        .createHash("sha256")
        .update(`${left}:${right}`, "utf8")
        .digest("hex");
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0] ?? GENESIS_AUDIT_HASH;
}

export function verifyAuditLedger(
  events: AuditEvent[],
): AuditLedgerVerificationResult {
  const findings: AuditLedgerTamperFinding[] = [];
  let expectedPrevHash = GENESIS_AUDIT_HASH;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const actualSeq = ev.sequence ?? i;
    if (actualSeq !== i) {
      findings.push({
        index: i,
        eventId: ev.eventId,
        reason: "SEQUENCE_MISMATCH",
        expected: String(i),
        actual: String(actualSeq),
      });
    }

    const actualPrevHash = ev.prevHash ?? GENESIS_AUDIT_HASH;
    if (actualPrevHash !== expectedPrevHash) {
      findings.push({
        index: i,
        eventId: ev.eventId,
        reason: "PREV_HASH_MISMATCH",
        expected: expectedPrevHash,
        actual: actualPrevHash,
      });
    }

    const expectedEntryHash = computeAuditEntryHash(
      ev,
      actualPrevHash,
      actualSeq,
    );
    const actualEntryHash = ev.entryHash ?? "";
    if (actualEntryHash !== expectedEntryHash) {
      findings.push({
        index: i,
        eventId: ev.eventId,
        reason: "ENTRY_HASH_MISMATCH",
        expected: expectedEntryHash,
        actual: actualEntryHash,
      });
    }

    expectedPrevHash = actualEntryHash || expectedEntryHash;
  }

  const merkleRoot = computeAuditMerkleRoot(events);
  const headHash =
    events.length > 0
      ? (events[events.length - 1]!.entryHash ?? expectedPrevHash)
      : GENESIS_AUDIT_HASH;

  return {
    valid: findings.length === 0,
    totalEvents: events.length,
    merkleRoot,
    headHash,
    findings,
  };
}

export class InMemoryAuditLogService implements IAuditLogService {
  private events: AuditEvent[] = [];

  async logEvent(
    event: Omit<
      AuditEvent,
      | "schemaVersion"
      | "eventId"
      | "timestamp"
      | "sequence"
      | "prevHash"
      | "entryHash"
    >,
  ): Promise<string> {
    const id = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const timestamp = new Date().toISOString();
    const sequence = this.events.length;
    const prevHash =
      sequence > 0
        ? (this.events[sequence - 1]!.entryHash ?? GENESIS_AUDIT_HASH)
        : GENESIS_AUDIT_HASH;

    const baseEvent: Omit<AuditEvent, "entryHash"> = {
      ...event,
      schemaVersion: "akcp.audit/v1",
      eventId: id,
      timestamp,
      sequence,
      prevHash,
    };
    const entryHash = computeAuditEntryHash(baseEvent, prevHash, sequence);
    const fullEvent: AuditEvent = {
      ...baseEvent,
      entryHash,
    };
    this.events.push(fullEvent);
    return id;
  }

  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.events.slice(-limit);
  }

  async verifyLedger(): Promise<AuditLedgerVerificationResult> {
    return verifyAuditLedger(this.events);
  }
}

export class FileAuditLogService implements IAuditLogService {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private readAllEvents(): AuditEvent[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as AuditEvent);
  }

  async logEvent(
    event: Omit<
      AuditEvent,
      | "schemaVersion"
      | "eventId"
      | "timestamp"
      | "sequence"
      | "prevHash"
      | "entryHash"
    >,
  ): Promise<string> {
    const existing = this.readAllEvents();
    const sequence = existing.length;
    const prevHash =
      sequence > 0
        ? (existing[sequence - 1]!.entryHash ?? GENESIS_AUDIT_HASH)
        : GENESIS_AUDIT_HASH;
    const id = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const timestamp = new Date().toISOString();
    const baseEvent: Omit<AuditEvent, "entryHash"> = {
      ...event,
      schemaVersion: "akcp.audit/v1",
      eventId: id,
      timestamp,
      sequence,
      prevHash,
    };
    const entryHash = computeAuditEntryHash(baseEvent, prevHash, sequence);
    const fullEvent: AuditEvent = {
      ...baseEvent,
      entryHash,
    };
    fs.appendFileSync(this.filePath, JSON.stringify(fullEvent) + "\n", "utf-8");
    return id;
  }

  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    const events = this.readAllEvents();
    return events.slice(-limit);
  }

  async verifyLedger(): Promise<AuditLedgerVerificationResult> {
    return verifyAuditLedger(this.readAllEvents());
  }
}
