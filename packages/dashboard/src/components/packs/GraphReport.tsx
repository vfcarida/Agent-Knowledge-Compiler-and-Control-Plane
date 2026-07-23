import { useState, useEffect } from "react";
import {
  Network,
  AlertTriangle,
  Link as LinkIcon,
  FileQuestion,
  ArrowRight,
} from "lucide-react";

interface GraphData {
  summary: {
    totalNodes: number;
    totalEdges: number;
    brokenLinks: Array<{
      sourceConceptId: string;
      targetConceptId: string;
      relationType: string;
    }>;
    orphanedConcepts: string[];
    highlyConnectedConcepts: string[];
  };
  impactMap: Record<string, string[]>;
}

export function GraphReport() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch("/api/manifest/graph");
        if (!res.ok)
          throw new Error(
            'Graph not found. Run "akcp graph build" to generate it.',
          );
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, []);

  if (loading)
    return <div className="text-zinc-500">Loading Semantic Graph...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="text-neon-indigo" />
            Semantic Graph & Impact Map
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Dependency analysis across OKF Knowledge Concepts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-neon-indigo/10 rounded-lg">
            <Network className="w-5 h-5 text-neon-indigo" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Nodes</p>
            <p className="text-xl font-bold text-white">
              {data.summary.totalNodes}
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-neon-blue/10 rounded-lg">
            <LinkIcon className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Edges</p>
            <p className="text-xl font-bold text-white">
              {data.summary.totalEdges}
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Broken Links</p>
            <p className="text-xl font-bold text-orange-400">
              {data.summary.brokenLinks.length}
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-zinc-500/10 rounded-lg">
            <FileQuestion className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Orphans</p>
            <p className="text-xl font-bold text-zinc-300">
              {data.summary.orphanedConcepts.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Broken Links
          </h3>
          {data.summary.brokenLinks.length === 0 ? (
            <p className="text-sm text-zinc-500">No broken links detected.</p>
          ) : (
            <ul className="space-y-2">
              {data.summary.brokenLinks.map((bl, i) => (
                <li
                  key={i}
                  className="text-sm bg-orange-500/5 border border-orange-500/10 p-2 rounded-lg flex items-center gap-2"
                >
                  <span className="text-zinc-300">{bl.sourceConceptId}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                  <span className="text-orange-400 font-mono text-xs">
                    {bl.targetConceptId}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-zinc-100">
            Highly Connected Concepts
          </h3>
          <ul className="space-y-2">
            {data.summary.highlyConnectedConcepts.map((hc) => (
              <li
                key={hc}
                className="text-sm text-neon-blue bg-neon-blue/5 border border-neon-blue/10 p-2 rounded-lg"
              >
                {hc}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
