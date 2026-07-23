import { useState, useEffect } from "react";
import {
  LineChart,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Flame,
} from "lucide-react";

export function EvalsSummary() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch("/data/eval-report.json");
        if (!res.ok) {
          throw new Error("Evals report not found or server error");
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 animate-pulse">
        <LineChart className="w-8 h-8 mr-3 animate-spin" />
        Loading Evals Summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-4 text-red-200">
        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-300">Failed to load Evals</h3>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs text-red-400/80 mt-2">
            Hint: Run `pnpm run evals` to generate a report, and ensure it is available at /data/eval-report.json.
          </p>
        </div>
      </div>
    );
  }

  const results = report.results || [];
  let totalSuccess = 0;
  let totalUnsafe = 0;
  results.forEach((r: any) => {
    totalSuccess += r.treatment.taskSuccess;
    totalUnsafe += r.treatment.unsafeActionRate;
  });

  const avgSuccess = results.length > 0 ? (totalSuccess / results.length) * 100 : 0;
  const avgUnsafe = results.length > 0 ? (totalUnsafe / results.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LineChart className="text-neon-indigo" />
            Evals Summary
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Tracking AKCP orchestration metrics and agent reliability.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Last Run
          </div>
          <div className="text-sm font-medium text-zinc-300 mt-1">
            {new Date(report.timestamp).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Task Success Rate
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {avgSuccess.toFixed(1)}%
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Average across {results.length} scenarios
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-neon-indigo/20 bg-indigo-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-24 h-24 text-neon-indigo" />
          </div>
          <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Scenarios Evaluated
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {results.length}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Benchmarked against raw baselines
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-orange-500/20 bg-orange-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flame className="w-24 h-24 text-orange-500" />
          </div>
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-widest">
            Unsafe Action Rate
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {avgUnsafe.toFixed(1)}%
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Targeting &lt; 15% via policy controls
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-200 mb-4">
          Scenario Results (Treatment vs Baseline)
        </h3>
        <div className="space-y-3">
          {results.map((r: any, idx: number) => {
            const successDelta = r.treatment.taskSuccess - r.baseline.taskSuccess;
            
            return (
              <div
                key={idx}
                className="glass-panel p-4 rounded-xl flex items-center justify-between border border-dark-border"
              >
                <div className="flex flex-col gap-1 w-1/2">
                  <div className="flex items-center gap-2">
                    {r.treatment.taskSuccess > 0 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-medium text-zinc-200">{r.scenario}</span>
                  </div>
                  <span className="text-xs text-zinc-500 truncate">{r.description}</span>
                </div>
                <div className="flex items-center gap-4 w-1/2 justify-end">
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Success</div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {r.treatment.taskSuccess} <span className="text-zinc-500">vs {r.baseline.taskSuccess}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Latency</div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {r.treatment.latencyMs.toFixed(0)}ms <span className="text-zinc-500">vs {r.baseline.latencyMs.toFixed(0)}ms</span>
                    </div>
                  </div>
                  <div className="text-right pl-4 border-l border-dark-border">
                    <div className="text-xs text-zinc-400">Delta</div>
                    <div className={`text-sm font-semibold ${successDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {successDelta > 0 ? "+" : ""}{(successDelta * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
