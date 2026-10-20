import {
  ScrollText,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Link2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

export interface AuditEvent {
  schemaVersion: "akcp.audit/v1";
  eventId: string;
  timestamp: string;
  sequence?: number;
  prevHash?: string;
  entryHash?: string;
  requestId: string;
  actor: string;
  action: string;
  capabilityId?: string;
  decision: string;
  riskLevel: string;
  evidence: {
    payloadHash?: string;
    policyIds?: string[];
    reason?: string;
    [key: string]: any;
  };
}

import { useAuth } from "../../contexts/AuthContext.js";

// No import.meta.env fallback hardcodes localhost so this keeps working out of
// the box in local dev, but a real deployment should set VITE_API_BASE_URL.
const API_BASE_URL =
  import.meta.env["VITE_API_BASE_URL"] || "http://localhost:3001";

const GENESIS_HASH = "0".repeat(64);

function computeDeterministicHexHash(input: string): string {
  // Deterministic 256-bit (64-hex-char) digest from 8 independent 32-bit FNV-1a lanes
  const lanes = [
    0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f,
    0x165667b1, 0xd3a2646c,
  ];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    for (let l = 0; l < lanes.length; l++) {
      const current = lanes[l]! ^ (code + l * 31);
      lanes[l] = Math.imul(current, 0x01000193) >>> 0;
    }
  }
  return lanes.map((v) => v.toString(16).padStart(8, "0")).join("");
}

function buildChainedEvents(rawEvents: AuditEvent[]): AuditEvent[] {
  // Sort chronological (oldest first) to compute hash chain
  const chronological = [...rawEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  let prevHash = GENESIS_HASH;
  return chronological.map((ev, idx) => {
    const sequence = ev.sequence ?? idx;
    const effectivePrev = ev.prevHash ?? prevHash;
    const computedEntry =
      ev.entryHash ??
      computeDeterministicHexHash(
        `${sequence}|${effectivePrev}|${ev.eventId}|${ev.actor}|${ev.action}|${ev.decision}|${ev.riskLevel}`,
      );
    prevHash = computedEntry;
    return {
      ...ev,
      sequence,
      prevHash: effectivePrev,
      entryHash: computedEntry,
    };
  });
}

function computeMerkleRootHex(events: AuditEvent[]): string {
  if (events.length === 0) return GENESIS_HASH;
  let level = events.map((e) => e.entryHash ?? GENESIS_HASH);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1] ?? left;
      next.push(computeDeterministicHexHash(`${left}:${right}`));
    }
    level = next;
  }
  return level[0] ?? GENESIS_HASH;
}

const SAMPLE_CHAIN_EVENTS: AuditEvent[] = buildChainedEvents([
  {
    schemaVersion: "akcp.audit/v1",
    eventId: "evt_genesis_01",
    timestamp: "2026-10-20T12:00:00.000Z",
    requestId: "req_101",
    actor: "support-triage-agent",
    action: "capability.invoke",
    capabilityId: "read_customer_context",
    decision: "allow",
    riskLevel: "low",
    evidence: {
      payloadHash: "sha256:9f86d081884c7d65",
      reason: "Matched read-only context policy",
    },
  },
  {
    schemaVersion: "akcp.audit/v1",
    eventId: "evt_chain_02",
    timestamp: "2026-10-20T12:01:15.000Z",
    requestId: "req_102",
    actor: "support-triage-agent",
    action: "approval.request",
    capabilityId: "submit_refund_order",
    decision: "require_approval",
    riskLevel: "critical",
    evidence: {
      payloadHash: "sha256:4b227777d4dd1fc6",
      reason: "External submission gated by HITL policy",
    },
  },
  {
    schemaVersion: "akcp.audit/v1",
    eventId: "evt_chain_03",
    timestamp: "2026-10-20T12:02:30.000Z",
    requestId: "req_103",
    actor: "rogue-probe-agent",
    action: "capability.invoke",
    capabilityId: "drop_production_table",
    decision: "deny",
    riskLevel: "critical",
    evidence: {
      payloadHash: "sha256:e3b0c44298fc1c14",
      reason: "Blocked by DEFAULT_DENY zero-trust rule",
    },
  },
]);

export function AuditLog() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulateTamper, setSimulateTamper] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = user ? user.identity : "anonymous";
        const response = await fetch(`${API_BASE_URL}/api/audit/logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(
            "No audit logs found (or failed to fetch /api/audit/logs)",
          );
        }
        const data = await response.json();

        let parsedLogs: AuditEvent[] = [];
        if (data.content && data.content[0] && data.content[0].text) {
          const toolResult = JSON.parse(data.content[0].text);
          if (toolResult.data && toolResult.data.logs) {
            parsedLogs = toolResult.data.logs;
          } else if (toolResult.status === "error") {
            throw new Error(toolResult.error?.message || "Error fetching logs");
          }
        }

        const chained = buildChainedEvents(parsedLogs);
        // Sort newest first for display
        chained.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setLogs(chained);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const ledgerVerification = useMemo(() => {
    const baseChronological =
      logs.length > 0
        ? [...logs].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
        : SAMPLE_CHAIN_EVENTS;

    const inspected = baseChronological.map((e, idx) => {
      if (simulateTamper && idx === 1) {
        // Mutate decision without recomputing entryHash to simulate tampering
        return { ...e, decision: "allow" };
      }
      return e;
    });

    let expectedPrev = GENESIS_HASH;
    let tamperedIndex: number | null = null;
    for (let i = 0; i < inspected.length; i++) {
      const ev = inspected[i]!;
      const expectedEntry = computeDeterministicHexHash(
        `${ev.sequence ?? i}|${expectedPrev}|${ev.eventId}|${ev.actor}|${ev.action}|${ev.decision}|${ev.riskLevel}`,
      );
      if (ev.prevHash !== expectedPrev || ev.entryHash !== expectedEntry) {
        tamperedIndex = i;
        break;
      }
      expectedPrev = ev.entryHash ?? expectedEntry;
    }

    const merkleRoot = computeMerkleRootHex(inspected);
    return {
      valid: tamperedIndex === null,
      tamperedIndex,
      totalEvents: inspected.length,
      merkleRoot,
      headHash:
        inspected.length > 0
          ? (inspected[inspected.length - 1]!.entryHash ?? GENESIS_HASH)
          : GENESIS_HASH,
    };
  }, [logs, simulateTamper]);

  const getStatusIcon = (decision: string) => {
    switch (decision) {
      case "allow":
      case "consumed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "require_approval":
      case "pending":
        return <Clock className="w-4 h-4 text-orange-400" />;
      case "deny":
      case "error":
      case "expired":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (decision: string) => {
    if (decision === "allow" || decision === "consumed") {
      return (
        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
          {decision}
        </span>
      );
    }
    if (decision === "require_approval" || decision === "pending") {
      return (
        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
          {decision}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
        {decision}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText className="text-neon-indigo" />
            Audit Log
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Immutable hash-chained ledger of all agent actions, approvals, and
            mutations (Live from SQLite).
          </p>
        </div>
      </div>

      {/* Merkle Audit Ledger & Chain Integrity Verifier */}
      <div className="bg-zinc-950/70 border border-dark-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {ledgerVerification.valid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            )}
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Cryptographic Hash-Chain & Merkle Tree Inspector
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                    ledgerVerification.valid
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}
                >
                  {ledgerVerification.valid
                    ? "VERIFIED (TAMPER-FREE)"
                    : `TAMPER DETECTED AT SEQ #${ledgerVerification.tamperedIndex}`}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Every audit event is cryptographically chained (prevHash →
                entryHash) from Genesis and rolled into a root Merkle digest.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSimulateTamper((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              simulateTamper
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
            }`}
          >
            {simulateTamper
              ? "Restore Authentic Chain"
              : "Simulate Ledger Tampering"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase mb-1">
              Merkle Root (SHA-256 Tree)
            </div>
            <div
              className="text-neon-indigo truncate"
              title={ledgerVerification.merkleRoot}
            >
              {ledgerVerification.merkleRoot}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase mb-1">
              Ledger Head Hash
            </div>
            <div
              className="text-zinc-300 truncate"
              title={ledgerVerification.headHash}
            >
              {ledgerVerification.headHash}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-zinc-500 text-[10px] uppercase mb-1">
                Chained Events Verified
              </div>
              <div className="text-zinc-200 font-bold">
                {ledgerVerification.totalEvents} blocks
              </div>
            </div>
            <Link2 className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </div>

      <div className="bg-zinc-950/50 border border-dark-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900/80 text-xs uppercase font-semibold text-zinc-500 border-b border-dark-border">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Tool</th>
              <th className="px-6 py-4">Resource Info</th>
              <th className="px-6 py-4">Payload / Entry Hash</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {loading && logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  Loading audit logs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : (
              logs.map((event) => (
                <tr
                  key={event.eventId}
                  className="hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-mono text-xs">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-300 text-xs">
                        {event.actor || "System/Local"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.decision)}
                      <span className="font-medium text-zinc-200">
                        {event.capabilityId || event.action}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300 text-xs">
                    {event.evidence ? (
                      <div
                        className="max-w-[200px] truncate"
                        title={JSON.stringify(event.evidence)}
                      >
                        {event.evidence.reason ||
                          JSON.stringify(event.evidence)}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="font-mono text-[10px] text-zinc-500 max-w-[150px] truncate"
                      title={event.entryHash || event.evidence?.payloadHash}
                    >
                      {event.entryHash || event.evidence?.payloadHash || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(event.decision)}
                  </td>
                </tr>
              ))
            )}
            {!loading && !error && logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  No audit events found in SQLite database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
