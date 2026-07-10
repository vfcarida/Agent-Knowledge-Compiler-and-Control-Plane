import { ScrollText, Clock, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AuditLogEntry {
  id: number;
  timestamp: number;
  action: string;
  toolName: string;
  payloadHash: string;
  metadata?: Record<string, any>;
  actorIdentity?: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/audit/logs');
        if (!response.ok) {
          throw new Error('Failed to fetch audit logs from BFF');
        }
        const data = await response.json();
        if (data.isError) {
          throw new Error(data.content[0].text);
        }
        const parsedContent = JSON.parse(data.content[0].text);
        setLogs(parsedContent.data.logs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    
    // Poll every 5s for new logs
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (action: string) => {
    switch(action) {
      case 'APPROVED': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'REVOKED': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'REJECTED_NOT_FOUND':
      case 'REJECTED_TOOL_MISMATCH':
      case 'REJECTED_HASH_MISMATCH':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (action: string) => {
    if (action === 'APPROVED') {
      return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">APPROVED</span>;
    }
    if (action === 'REVOKED') {
      return <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">REVOKED</span>;
    }
    return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">REJECTED</span>;
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
            Immutable ledger of all agent actions, approvals, and mutations (Live from SQLite).
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
               <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Loading audit logs...</td></tr>
            ) : error ? (
               <tr><td colSpan={6} className="px-6 py-12 text-center text-red-400">Error: {error}</td></tr>
            ) : logs.map((event) => (
              <tr key={event.id} className="hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-mono text-xs">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-300 text-xs">{event.actorIdentity || 'System/Local'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(event.action)}
                    <span className="font-medium text-zinc-200">{event.toolName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-300 text-xs">
                   {event.metadata ? (
                     <div className="max-w-[200px] truncate">
                       {event.metadata.platform || event.metadata.jobUrl || JSON.stringify(event.metadata)}
                     </div>
                   ) : '-'}
                </td>
                <td className="px-6 py-4">
                   <div className="font-mono text-[10px] text-zinc-500 max-w-[150px] truncate" title={event.payloadHash}>
                     {event.payloadHash}
                   </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(event.action)}
                  {event.action.startsWith('REJECTED') && (
                     <div className="text-[10px] text-red-500/70 mt-1 uppercase">{event.action.replace('REJECTED_', '')}</div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
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
