import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  Key,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.js";

interface PendingApproval {
  token: string;
  toolName: string;
  payloadHash: string;
  expiresAt: number;
  metadata?: {
    jobUrl?: string;
    platform?: string;
    autonomyLevel?: string;
    sideEffectLevel?: string;
    [key: string]: any;
  };
}

export function ApprovalQueue() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: React.ReactNode;
    type: "confirm" | "alert";
    onConfirm?: () => void;
  } | null>(null);

  const showAlert = (title: string, message: React.ReactNode) => {
    setModalConfig({ title, message, type: "alert" });
    setModalOpen(true);
  };

  const showConfirm = (title: string, message: React.ReactNode, onConfirm: () => void) => {
    setModalConfig({ title, message, type: "confirm", onConfirm });
    setModalOpen(true);
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/automation/approvals", {
        headers: {
          "Authorization": user ? `Bearer ${user.identity}` : ""
        }
      });
      if (!res.ok) throw new Error("Failed to fetch approvals from server");
      const data = await res.json();

      if (data.isError) {
        throw new Error(data.content[0].text);
      }

      const parsed = JSON.parse(data.content[0].text);
      if (parsed.ok === false && parsed.error) {
        throw new Error(parsed.error.message);
      }

      setApprovals(parsed.data?.pending || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (token: string, jobUrl?: string) => {
    if (!user) {
      showAlert("Authentication Required", "You must be logged in to approve actions.");
      return;
    }
    
    showConfirm(
      "Authorize Execution",
      <div className="space-y-2">
        <p>Are you sure you want to authorize this operation?</p>
        <p className="text-xs text-zinc-400">The agent will immediately execute this payload.</p>
      </div>,
      async () => {
        setModalOpen(false);
        setProcessing(token);
        try {
          const res = await fetch("/api/automation/approve", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.identity}` 
            },
            body: JSON.stringify({
              approvalToken: token,
              jobUrl,
              dryRun: false,
              approverIdentity: user.identity,
            }),
          });
          const data = await res.json();
          if (data.isError || !res.ok) {
            showAlert("Approval Failed", data.content?.[0]?.text || data.error);
          } else {
            const parsed = JSON.parse(data.content[0].text);
            if (parsed.ok === false) {
              showAlert("Approval Failed", parsed.error?.message);
            } else {
              showAlert("Success", "Action successfully approved and submitted to the agent.");
              await fetchApprovals();
            }
          }
        } catch (err: any) {
          showAlert("Error", err.message);
        } finally {
          setProcessing(null);
        }
      }
    );
  };

  const handleRevoke = async (token: string) => {
    if (!user) {
      showAlert("Authentication Required", "You must be logged in to revoke actions.");
      return;
    }
    
    showConfirm(
      "Revoke Token",
      <div className="space-y-2 text-red-400">
        <p>Are you sure you want to revoke this approval token?</p>
        <p className="text-xs">The agent will be denied execution and the token will be invalidated permanently.</p>
      </div>,
      async () => {
        setModalOpen(false);
        setProcessing(token);
        try {
          const res = await fetch("/api/automation/revoke", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.identity}`
            },
            body: JSON.stringify({
              approvalToken: token,
              approverIdentity: user.identity,
            }),
          });
          const data = await res.json();
          if (data.isError || !res.ok) {
            showAlert("Revoke Failed", data.content?.[0]?.text || data.error);
          } else {
            const parsed = JSON.parse(data.content[0].text);
            if (parsed.ok === false) {
              showAlert("Revoke Failed", parsed.error?.message);
            } else {
              await fetchApprovals();
            }
          }
        } catch (err: any) {
          showAlert("Error", err.message);
        } finally {
          setProcessing(null);
        }
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-neon-purple" />
            Human-in-the-Loop Approval Queue
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Review and explicitly authorize sensitive agent operations. Verify
            payload hashes before granting execution.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchApprovals();
          }}
          className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-lg text-sm text-zinc-300 transition-colors cursor-pointer"
        >
          {loading ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium">
              Failed to connect to Automation Server
            </h3>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && approvals.length === 0 && (
        <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-2 border-zinc-700/50 animate-in fade-in duration-700">
          <ShieldCheck className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-emerald-400">
            No pending approvals
          </h3>
          <p className="text-zinc-500 mt-2 text-sm">
            All agent operations are currently running within their allowed
            safety boundaries.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {approvals.map((app) => (
          <div
            key={app.token}
            className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-start justify-between border-l-4 border-l-neon-purple gap-6 animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-neon-purple/20 text-neon-purple uppercase tracking-wider">
                  {app.toolName}
                </span>
                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/20 text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {app.metadata?.sideEffectLevel || "external-submit"}
                </span>

                {/* Live vs Dry-Run Badge */}
                {app.metadata?.dryRun ? (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/20 text-blue-400 uppercase tracking-wider border border-blue-500/30">
                    Simulation (Dry-Run)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-orange-500/20 text-orange-400 uppercase tracking-wider border border-orange-500/30 animate-pulse">
                    LIVE ACTION
                  </span>
                )}

                <span className="flex items-center gap-1.5 text-xs text-amber-400/80 font-medium ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  Expires in{" "}
                  {Math.max(0, Math.round((app.expiresAt - Date.now()) / 1000))}
                  s
                </span>
              </div>

              <div>
                <h3 className="text-zinc-200 font-medium text-lg truncate max-w-xl">
                  {app.metadata?.jobUrl || "Unknown Target Resource"}
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Target Platform:{" "}
                  <span className="text-zinc-300 font-medium">
                    {app.metadata?.platform || "Unknown"}
                  </span>
                </p>
              </div>

              <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Cryptographic Payload Hash
                  </span>
                  <Key className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <code className="text-xs text-neon-blue font-mono bg-black/40 px-2 py-1 rounded truncate select-all">
                  {app.payloadHash || "N/A"}
                </code>

                {app.metadata?.payload && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-2">
                      Complete Payload Data
                    </span>
                    <pre className="text-[10px] text-zinc-400 font-mono bg-black/40 p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(app.metadata.payload, null, 2)}
                    </pre>
                  </div>
                )}

                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  This hash guarantees the agent cannot alter the data payload
                  after this token is generated. Inspecting this hash matches
                  the exact payload computed in the CLI or audit log.
                </p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 justify-end items-stretch md:w-48 shrink-0">
              <button
                onClick={() => handleApprove(app.token, app.metadata?.jobUrl)}
                disabled={processing === app.token}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium px-4 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {processing === app.token ? (
                  "Approving..."
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Authorize
                  </>
                )}
              </button>

              <button
                onClick={() => handleRevoke(app.token)}
                disabled={processing === app.token}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-white/5 hover:border-red-500/30 font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {processing === app.token ? (
                  "Revoking..."
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Revoke Token
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-4 border-b ${modalConfig.type === 'confirm' ? 'border-white/5 bg-zinc-800/50' : 'border-red-500/20 bg-red-500/5'}`}>
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                {modalConfig.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {modalConfig.title}
              </h3>
            </div>
            <div className="p-6 text-zinc-300">
              {modalConfig.message}
            </div>
            <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                {modalConfig.type === 'confirm' ? 'Cancel' : 'Close'}
              </button>
              {modalConfig.type === 'confirm' && (
                <button
                  onClick={modalConfig.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-neon-indigo hover:bg-neon-purple rounded-lg shadow-lg shadow-neon-indigo/20 transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
