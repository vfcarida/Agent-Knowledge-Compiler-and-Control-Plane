export type AuditEventAction = "capability.invoke" | "policy.evaluate" | "approval.request" | "approval.consume" | "approval.expire" | "system.error" | "rate_limit.exceeded" | "auth.failed";
export type AuditEventDecision = "allow" | "deny" | "require_approval" | "error" | "pending" | "consumed" | "expired";
export type AuditRiskLevel = "low" | "medium" | "high" | "critical";

export interface AuditEvent {
  schemaVersion: "akcp.audit/v1";
  eventId: string;
  timestamp: string;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface IAuditLogService {
  // eslint-disable-next-line no-unused-vars
  logEvent(event: Omit<AuditEvent, "schemaVersion" | "eventId" | "timestamp">): Promise<string>;
  // eslint-disable-next-line no-unused-vars
  getEvents(limit?: number): Promise<AuditEvent[]>;
}

import fs from "fs";
import path from "path";
import crypto from "crypto";

export class InMemoryAuditLogService implements IAuditLogService {
  private events: AuditEvent[] = [];

  async logEvent(event: Omit<AuditEvent, "schemaVersion" | "eventId" | "timestamp">): Promise<string> {
    const id = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const fullEvent: AuditEvent = {
      ...event,
      schemaVersion: "akcp.audit/v1",
      eventId: id,
      timestamp: new Date().toISOString()
    };
    this.events.push(fullEvent);
    return id;
  }

  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.events.slice(-limit);
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

  async logEvent(event: Omit<AuditEvent, "schemaVersion" | "eventId" | "timestamp">): Promise<string> {
    const id = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const fullEvent: AuditEvent = {
      ...event,
      schemaVersion: "akcp.audit/v1",
      eventId: id,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync(this.filePath, JSON.stringify(fullEvent) + "\n", "utf-8");
    return id;
  }

  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const lines = fs.readFileSync(this.filePath, "utf-8").split("\n").filter(l => l.trim().length > 0);
    const events = lines.map(l => JSON.parse(l) as AuditEvent);
    return events.slice(-limit);
  }
}
