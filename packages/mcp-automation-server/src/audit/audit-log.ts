import { randomUUID } from "crypto";

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  requestId: string;
  toolName: string;
  autonomyLevel: string;
  approvalRequired: boolean;
  sideEffectLevel: string;
  status: "success" | "failure" | "blocked";
  durationMs?: number;
  details?: Record<string, unknown>;
}

export class AuditLogger {
  log(event: Omit<AuditEvent, "eventId" | "timestamp">) {
    const fullEvent: AuditEvent = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    // In a real enterprise system, this should write to a secure append-only log.
    // For this reference architecture, we output to stdout with structured JSON.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(fullEvent));
  }
}

export const auditLogger = new AuditLogger();
