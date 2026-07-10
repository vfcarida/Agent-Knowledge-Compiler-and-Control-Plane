import { useState, useEffect } from 'react';
import { LineChart, CheckCircle, AlertTriangle, Cpu, Flame } from 'lucide-react';

export function EvalsSummary() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/evals/report');
        if (!res.ok) {
          throw new Error('Evals report not found or server error');
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
          <p className="text-xs text-red-400/80 mt-2">Hint: Run `pnpm run test` in packages/evals to generate a report.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LineChart className="text-neon-indigo" />
            Evals Summary
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Tracking AKCP orchestration metrics and tool accuracy.
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
            Win Rate
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {report.summary.passRate}%
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            {report.summary.passed} passed / {report.summary.total} total tests
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-neon-indigo/20 bg-indigo-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-24 h-24 text-neon-indigo" />
          </div>
          <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Capabilities Tested
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {Object.keys(report.results).length}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            MCP tools evaluated for constraints
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-orange-500/20 bg-orange-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flame className="w-24 h-24 text-orange-500" />
          </div>
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-widest">
            Hallucination Rate
          </h3>
          <div className="text-4xl font-bold text-white mt-2">
            {report.summary.failed > 0 ? ((report.summary.failed / report.summary.total) * 100).toFixed(1) : '0'}%
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Targeting 0% via strict descriptions
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-200 mb-4">Test Results</h3>
        <div className="space-y-3">
          {Object.entries(report.results).map(([testName, result]: [string, any]) => (
            <div key={testName} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-dark-border">
              <div className="flex items-center gap-3">
                {result.passed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-medium text-zinc-200">{testName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono bg-black/40 text-zinc-400 px-2 py-1 rounded">
                  {result.durationMs}ms
                </span>
                <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                  result.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {result.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
