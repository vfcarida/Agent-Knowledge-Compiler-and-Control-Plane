import crypto from "node:crypto";
import type { IApprovalStore, PendingApproval } from "./approval-store.js";

export interface QuorumVote {
  approverId: string;
  clusterId: string;
  approvedAt: number;
  voteDigest: string;
}

export interface QuorumPendingApproval extends PendingApproval {
  requiredApprovals: number;
  approvalsReceived: QuorumVote[];
}

export interface QuorumApprovalStoreOptions {
  clusterId?: string;
  defaultRequiredApprovals?: number;
  riskQuorumMap?: Partial<
    Record<"low" | "medium" | "high" | "critical", number>
  >;
  disallowSelfApproval?: boolean;
  defaultTtlMs?: number;
}

export interface QuorumStateSnapshot {
  schemaVersion: "akcp.quorum-crdt/v1";
  clusterId: string;
  exportedAt: number;
  records: QuorumPendingApproval[];
}

const STATUS_PRECEDENCE: Record<PendingApproval["status"], number> = {
  PENDING: 1,
  APPROVED: 2,
  EXPIRED: 3,
  CONSUMED: 4,
  REVOKED: 5,
};

function computeVoteDigest(
  token: string,
  approverId: string,
  clusterId: string,
  approvedAt: number,
): string {
  return crypto
    .createHash("sha256")
    .update(`${token}|${approverId}|${clusterId}|${approvedAt}`, "utf8")
    .digest("hex");
}

/**
 * Multi-party M-of-N Quorum Human-In-The-Loop Approval Store with
 * conflict-free replicated data type (state-based CRDT) multi-cluster synchronization.
 */
export class QuorumApprovalStore implements IApprovalStore {
  private readonly clusterId: string;
  private readonly defaultRequiredApprovals: number;
  private readonly riskQuorumMap: Record<string, number>;
  private readonly disallowSelfApproval: boolean;
  private readonly defaultTtlMs: number;
  private readonly records = new Map<string, QuorumPendingApproval>();
  private readonly auditLogs: Array<Record<string, unknown>> = [];

  constructor(options: QuorumApprovalStoreOptions = {}) {
    this.clusterId = options.clusterId ?? "cluster-primary";
    this.defaultRequiredApprovals = options.defaultRequiredApprovals ?? 1;
    this.riskQuorumMap = {
      low: 1,
      medium: 1,
      high: 1,
      critical: 2,
      ...(options.riskQuorumMap ?? {}),
    };
    this.disallowSelfApproval = options.disallowSelfApproval ?? true;
    this.defaultTtlMs = options.defaultTtlMs ?? 15 * 60 * 1000;
  }

  public generateToken(
    requestId: string,
    capabilityId: string,
    payloadHash: string,
    riskLevel: string,
    sideEffectLevel: string,
    requestedBy: string,
    metadata?: Record<string, unknown>,
    ttlMs?: number,
  ): string {
    const now = Date.now();
    const randomSeed = crypto.randomBytes(16).toString("hex");
    const token =
      "qtok_" +
      crypto
        .createHash("sha256")
        .update(`${requestId}:${capabilityId}:${payloadHash}:${randomSeed}`)
        .digest("hex")
        .slice(0, 32);

    const requiredApprovals = Math.max(
      1,
      this.riskQuorumMap[riskLevel] ?? this.defaultRequiredApprovals,
    );

    const record: QuorumPendingApproval = {
      token,
      requestId,
      capabilityId,
      payloadHash,
      riskLevel,
      sideEffectLevel,
      requestedBy,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.defaultTtlMs),
      status: "PENDING",
      auditEventIds: [],
      metadata,
      requiredApprovals,
      approvalsReceived: [],
    };

    this.records.set(token, record);
    this.auditLogs.push({
      action: "quorum.request",
      token,
      capabilityId,
      requestedBy,
      requiredApprovals,
      clusterId: this.clusterId,
      timestamp: new Date(now).toISOString(),
    });
    return token;
  }

  public getApprovalRecord(token: string): QuorumPendingApproval | undefined {
    return this.records.get(token);
  }

  public getPendingApprovals(): QuorumPendingApproval[] {
    const now = Date.now();
    const result: QuorumPendingApproval[] = [];
    for (const rec of this.records.values()) {
      if (rec.status === "PENDING" && now > rec.expiresAt) {
        rec.status = "EXPIRED";
      }
      if (rec.status === "PENDING") {
        result.push(rec);
      }
    }
    return result;
  }

  public getAuditLogs(limit: number = 100): unknown[] {
    return this.auditLogs.slice(-limit);
  }

  public approveToken(
    token: string,
    actorIdentity: string = "supervisor-default",
  ): boolean {
    const rec = this.records.get(token);
    if (!rec) return false;

    const now = Date.now();
    if (now > rec.expiresAt && rec.status === "PENDING") {
      rec.status = "EXPIRED";
      return false;
    }

    if (rec.status !== "PENDING" && rec.status !== "APPROVED") {
      return false;
    }

    if (this.disallowSelfApproval && actorIdentity === rec.requestedBy) {
      return false;
    }

    const alreadyVoted = rec.approvalsReceived.some(
      (v) => v.approverId === actorIdentity,
    );
    if (!alreadyVoted) {
      const vote: QuorumVote = {
        approverId: actorIdentity,
        clusterId: this.clusterId,
        approvedAt: now,
        voteDigest: computeVoteDigest(
          token,
          actorIdentity,
          this.clusterId,
          now,
        ),
      };
      rec.approvalsReceived.push(vote);
    }

    if (rec.approvalsReceived.length >= rec.requiredApprovals) {
      rec.status = "APPROVED";
      rec.approvedBy = rec.approvalsReceived.map((v) => v.approverId).join(",");
    }

    this.auditLogs.push({
      action: "quorum.vote",
      token,
      approverId: actorIdentity,
      votesCount: rec.approvalsReceived.length,
      requiredApprovals: rec.requiredApprovals,
      status: rec.status,
      clusterId: this.clusterId,
      timestamp: new Date(now).toISOString(),
    });

    return rec.status === "APPROVED";
  }

  public validateAndConsume(
    token: string,
    capabilityId: string,
    payloadHash: string,
    actorIdentity?: string,
  ): boolean {
    const rec = this.records.get(token);
    if (!rec) return false;

    const now = Date.now();
    if (now > rec.expiresAt) {
      rec.status = "EXPIRED";
      return false;
    }

    if (
      rec.status !== "APPROVED" ||
      rec.approvalsReceived.length < rec.requiredApprovals
    ) {
      return false;
    }

    if (rec.capabilityId !== capabilityId || rec.payloadHash !== payloadHash) {
      return false;
    }

    rec.status = "CONSUMED";
    rec.consumedAt = now;
    this.auditLogs.push({
      action: "quorum.consume",
      token,
      capabilityId,
      consumedBy: actorIdentity ?? rec.requestedBy,
      clusterId: this.clusterId,
      timestamp: new Date(now).toISOString(),
    });
    return true;
  }

  public revokeToken(
    token: string,
    actorIdentity: string = "security-admin",
  ): boolean {
    const rec = this.records.get(token);
    if (!rec) return false;
    if (rec.status === "CONSUMED") return false;

    rec.status = "REVOKED";
    this.auditLogs.push({
      action: "quorum.revoke",
      token,
      revokedBy: actorIdentity,
      clusterId: this.clusterId,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Exports a deterministic state-based CRDT snapshot for cross-cluster federation.
   */
  public exportStateSnapshot(): QuorumStateSnapshot {
    return {
      schemaVersion: "akcp.quorum-crdt/v1",
      clusterId: this.clusterId,
      exportedAt: Date.now(),
      records: [...this.records.values()].map((r) => ({
        ...r,
        approvalsReceived: [...r.approvalsReceived],
        auditEventIds: [...r.auditEventIds],
      })),
    };
  }

  /**
   * Merges a remote cluster's CRDT snapshot using a monotonic join semilattice:
   * - Votes are merged by set-union keyed by approverId (keeping earliest vote timestamp).
   * - Status is joined by precedence (REVOKED > CONSUMED > EXPIRED > APPROVED > PENDING),
   *   and automatically promoted to APPROVED if the merged vote union meets requiredApprovals.
   */
  public mergeRemoteSnapshot(snapshot: QuorumStateSnapshot): {
    mergedRecords: number;
    newlyApprovedTokens: string[];
  } {
    const newlyApprovedTokens: string[] = [];
    let mergedRecords = 0;

    for (const remoteRec of snapshot.records) {
      mergedRecords++;
      const localRec = this.records.get(remoteRec.token);
      if (!localRec) {
        const cloned: QuorumPendingApproval = {
          ...remoteRec,
          approvalsReceived: [...remoteRec.approvalsReceived],
          auditEventIds: [...remoteRec.auditEventIds],
        };
        this.records.set(cloned.token, cloned);
        if (cloned.status === "APPROVED") {
          newlyApprovedTokens.push(cloned.token);
        }
        continue;
      }

      const wasApproved = localRec.status === "APPROVED";

      // 1. Set union of votes keyed by approverId
      const voteMap = new Map<string, QuorumVote>();
      for (const v of localRec.approvalsReceived) {
        voteMap.set(v.approverId, v);
      }
      for (const rv of remoteRec.approvalsReceived) {
        const existing = voteMap.get(rv.approverId);
        if (!existing || rv.approvedAt < existing.approvedAt) {
          voteMap.set(rv.approverId, rv);
        }
      }
      localRec.approvalsReceived = [...voteMap.values()].sort(
        (a, b) => a.approvedAt - b.approvedAt,
      );

      // 2. Join status across lattice
      const localRank = STATUS_PRECEDENCE[localRec.status];
      const remoteRank = STATUS_PRECEDENCE[remoteRec.status];
      if (remoteRank > localRank) {
        localRec.status = remoteRec.status;
      }

      // 3. Promote PENDING -> APPROVED if merged quorum reached
      if (
        localRec.status === "PENDING" &&
        localRec.approvalsReceived.length >= localRec.requiredApprovals
      ) {
        localRec.status = "APPROVED";
      }

      if (localRec.approvalsReceived.length > 0) {
        localRec.approvedBy = localRec.approvalsReceived
          .map((v) => v.approverId)
          .join(",");
      }

      if (remoteRec.consumedAt && !localRec.consumedAt) {
        localRec.consumedAt = remoteRec.consumedAt;
      }

      if (!wasApproved && localRec.status === "APPROVED") {
        newlyApprovedTokens.push(localRec.token);
      }
    }

    return { mergedRecords, newlyApprovedTokens };
  }
}
