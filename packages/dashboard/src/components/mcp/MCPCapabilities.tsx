import { useState, useEffect } from "react";
import { Wrench, ShieldAlert, Activity, Key, Terminal } from "lucide-react";

interface MCPTool {
  name: string;
  description: string;
  kind: string;
  riskLevel: string;
  sideEffects?: string;
  requiresApproval?: boolean;
  inputsSchema?: any;
}

export function MCPCapabilities() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch("/api/mcp/tools");
        if (!res.ok) throw new Error("Failed to fetch MCP tools");
        const data = await res.json();
        setTools(data.tools || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-neon-blue" />
          MCP Capabilities Registry
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Dynamically compiled Model Context Protocol tools available to the agent.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400 animate-pulse">Loading tools...</div>
      ) : (
        <div className="grid gap-6">
          {tools.filter((t) => t.kind === "mcp-tool" || t.kind === "tool").map((tool) => (
            <div
              key={tool.name}
              className="glass-panel p-6 rounded-2xl border-l-4 border-l-neon-blue"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-zinc-100">{tool.name}</h3>
                    {tool.requiresApproval ? (
                      <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-orange-500/20 text-orange-400 uppercase tracking-wider flex items-center gap-1 border border-orange-500/30">
                        <ShieldAlert className="w-3 h-3" />
                        HITL REQUIRED
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30">
                        <Activity className="w-3 h-3" />
                        AUTO-EXECUTE
                      </span>
                    )}
                  </div>
                  
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl">
                    {tool.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5 text-zinc-500 bg-black/40 px-3 py-1.5 rounded-lg">
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                      Side Effects: <span className="text-zinc-300">{tool.sideEffects || "read"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 bg-black/40 px-3 py-1.5 rounded-lg">
                      <Key className="w-3.5 h-3.5 text-zinc-400" />
                      Risk Level:{" "}
                      <span className={`
                        ${tool.riskLevel === 'high' ? 'text-red-400' : ''}
                        ${tool.riskLevel === 'medium' ? 'text-amber-400' : ''}
                        ${tool.riskLevel === 'low' ? 'text-emerald-400' : ''}
                      `}>
                        {tool.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-96 shrink-0 bg-zinc-950/80 p-4 rounded-xl border border-white/5 overflow-x-auto">
                  <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                    Input Schema
                  </h4>
                  <pre className="text-xs text-neon-purple font-mono leading-relaxed">
                    {JSON.stringify(tool.inputsSchema?.properties || tool.inputsSchema || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
