export interface ApprovalPayload {
  toolName: string;
  payloadHash: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export type { PendingApproval, IApprovalStore } from "@akcp/core";

export interface AuditLog {
  id?: number | string;
  timestamp: number;
  action: string;
  toolName: string;
  payloadHash: string;
  metadata?: Record<string, unknown>;
  actorIdentity?: string;
}
