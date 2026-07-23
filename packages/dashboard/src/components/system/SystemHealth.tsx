import { useState } from "react";
import {
  ServerCog,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
} from "lucide-react";

export function SystemHealth() {
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/validate", { method: "POST" });
      const data = await res.json();
      if (data.isError || !res.ok) {
        throw new Error(
          data.content?.[0]?.text || data.error || "Server error",
        );
      }

      const parsed = JSON.parse(data.content[0].text);
      if (parsed.ok === false && parsed.error) {
        throw new Error(parsed.error.message);
      }

      setReport(parsed.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-neon-indigo" />
            Bundle Health
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Validate your local Context Packs to ensure Agent-Ready Knowledge
            consistency.
          </p>
        </div>
        <button
          onClick={handleValidate}
          disabled={validating}
          className="flex items-center gap-2 bg-gradient-to-r from-neon-indigo to-neon-blue hover:from-neon-indigo/90 hover:to-neon-blue/90 border border-white/10 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all"
        >
          {validating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ServerCog className="w-4 h-4" />
          )}
          Run Health Check
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-300">Validation Error</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!report && !validating && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-zinc-900/50 border border-dark-border rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            No Report Generated
          </h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Click 'Run Health Check' to trigger the Zod validation pipeline
            against your local `.agent-context` bundle.
          </p>
        </div>
      )}

      {validating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="w-8 h-8 text-neon-indigo animate-spin mb-4" />
          <p className="text-sm text-zinc-400">
            Validating bundle against strict schemas...
          </p>
        </div>
      )}

      {report && !validating && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 gap-6">
            <div
              className={`glass-panel p-6 rounded-2xl border relative overflow-hidden ${
                report.valid
                  ? "border-emerald-500/30 bg-emerald-950/10"
                  : "border-red-500/30 bg-red-950/10"
              }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                {report.valid ? (
                  <CheckCircle className="w-24 h-24 text-emerald-500" />
                ) : (
                  <XCircle className="w-24 h-24 text-red-500" />
                )}
              </div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Status
              </h3>
              <div className="text-3xl font-bold text-white mt-2">
                {report.valid ? "Healthy" : "Invalid Bundle"}
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                {report.totalFiles} files checked across {report.totalProfiles}{" "}
                domains.
              </p>
            </div>
          </div>

          {!report.valid && report.errors.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Action Required: Fix Validation Errors
              </h3>
              <div className="space-y-3">
                {report.errors.map((err: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-red-950/30 border border-red-500/20 p-4 rounded-xl"
                  >
                    <p className="font-mono text-xs text-red-300 mb-1">
                      {err.file}
                    </p>
                    <p className="text-sm text-red-200">{err.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
