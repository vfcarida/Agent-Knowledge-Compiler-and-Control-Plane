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
    // eslint-disable-next-line no-unused-vars
    requestId: string,
    // eslint-disable-next-line no-unused-vars
    capabilityId: string,
    // eslint-disable-next-line no-unused-vars
    payloadHash: string,
    // eslint-disable-next-line no-unused-vars
    riskLevel: string,
    // eslint-disable-next-line no-unused-vars
    sideEffectLevel: string,
    // eslint-disable-next-line no-unused-vars
    requestedBy: string,
    // eslint-disable-next-line no-unused-vars
    metadata?: Record<string, unknown>,
    // eslint-disable-next-line no-unused-vars
    ttlMs?: number,
  ): string | Promise<string>;
  getPendingApprovals(): PendingApproval[] | Promise<PendingApproval[]>;
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-explicit-any
  getAuditLogs(limit?: number): any[] | Promise<any[]>;
  approveToken(
    // eslint-disable-next-line no-unused-vars
    token: string,
    // eslint-disable-next-line no-unused-vars
    actorIdentity?: string,
  ): boolean | Promise<boolean>;
  validateAndConsume(
    // eslint-disable-next-line no-unused-vars
    token: string,
    // eslint-disable-next-line no-unused-vars
    capabilityId: string,
    // eslint-disable-next-line no-unused-vars
    payloadHash: string,
    // eslint-disable-next-line no-unused-vars
    actorIdentity?: string,
  ): boolean | Promise<boolean>;
  revokeToken(
    // eslint-disable-next-line no-unused-vars
    token: string,
    // eslint-disable-next-line no-unused-vars
    actorIdentity?: string,
  ): boolean | Promise<boolean>;
}
