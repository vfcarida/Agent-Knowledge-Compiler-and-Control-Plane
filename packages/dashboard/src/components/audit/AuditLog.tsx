import {
  ScrollText,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";

export interface AuditEvent {
  schemaVersion: "akcp.audit/v1";
  eventId: string;
  timestamp: string;
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

export function AuditLog() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = user ? user.identity : "anonymous";
        const response = await fetch("http://localhost:3001/api/audit/logs", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error("No audit logs found (or failed to fetch /api/audit/logs)");
        }
        const data = await response.json();
        
        // Parse the MCP tool response format
        let parsedLogs: AuditEvent[] = [];
        if (data.content && data.content[0] && data.content[0].text) {
          const toolResult = JSON.parse(data.content[0].text);
          if (toolResult.data && toolResult.data.logs) {
            parsedLogs = toolResult.data.logs;
          } else if (toolResult.status === "error") {
             throw new Error(toolResult.error?.message || "Error fetching logs");
          }
        }

        // Sort newest first
        parsedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(parsedLogs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

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
            Immutable ledger of all agent actions, approvals, and mutations
            (Live from SQLite).
          </p>
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
              <th className="px-6 py-4">Payload Hash</th>
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
                      <div className="max-w-[200px] truncate" title={JSON.stringify(event.evidence)}>
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
                      title={event.evidence?.payloadHash}
                    >
                      {event.evidence?.payloadHash || "-"}
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
