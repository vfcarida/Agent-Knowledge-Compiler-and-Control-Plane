export interface PendingApproval {
  token: string;
  requestId: string;
  capabilityId: string;
  payloadHash: string;
  riskLevel: string;
  sideEffectLevel: string;
  requestedBy: string;
  approvedBy?: string;
  createdAt: number;
  expiresAt: number;
  consumedAt?: number;
  status: "PENDING" | "APPROVED" | "REVOKED" | "EXPIRED" | "CONSUMED";
  auditEventIds: string[];
  metadata?: Record<string, unknown>;
}

export interface IApprovalStore {
  generateToken(
    requestId: string,

    capabilityId: string,

    payloadHash: string,

    riskLevel: string,

    sideEffectLevel: string,

    requestedBy: string,

    metadata?: Record<string, unknown>,

    ttlMs?: number,
  ): string | Promise<string>;
  getPendingApprovals(): PendingApproval[] | Promise<PendingApproval[]>;

  getAuditLogs(limit?: number): unknown[] | Promise<unknown[]>;
  approveToken(
    token: string,

    actorIdentity?: string,
  ): boolean | Promise<boolean>;
  validateAndConsume(
    token: string,

    capabilityId: string,

    payloadHash: string,

    actorIdentity?: string,
  ): boolean | Promise<boolean>;
  revokeToken(
    token: string,

    actorIdentity?: string,
  ): boolean | Promise<boolean>;
}
