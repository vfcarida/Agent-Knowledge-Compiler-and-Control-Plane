import { useState, useEffect, useMemo } from "react";
import {
  Network,
  AlertTriangle,
  Link as LinkIcon,
  FileQuestion,
  ArrowRight,
  Zap,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { CareerBundleData, OKFDoc } from "../../types/career.js";

interface GraphNodeItem {
  conceptId: string;
  title?: string;
  type: string;
  status?: string;
}

interface GraphEdgeItem {
  sourceConceptId: string;
  targetConceptId: string;
  relationType: string;
}

interface GraphData {
  nodes?: GraphNodeItem[];
  edges?: GraphEdgeItem[];
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

interface GraphReportProps {
  data?: CareerBundleData;
}

function buildClientFallbackGraph(data?: CareerBundleData): GraphData | null {
  if (!data) return null;
  const allDocs: OKFDoc[] = [
    ...data.skills,
    ...data.experiences,
    ...data.preferences,
    ...data.applications,
    ...data.other,
  ];
  if (allDocs.length === 0) return null;
  const nodes: GraphNodeItem[] = allDocs.map((d) => ({
    conceptId: d.conceptId,
    title: d.frontmatter.title || d.conceptId,
    type: d.frontmatter.type || "Concept",
    status: (d.frontmatter as Record<string, unknown>).status as
      string | undefined,
  }));

  const nodeIds = new Set(nodes.map((n) => n.conceptId));
  const edges: GraphEdgeItem[] = [];
  const brokenLinks: GraphEdgeItem[] = [];
  const impactMap: Record<string, string[]> = {};

  for (const n of nodes) {
    impactMap[n.conceptId] = [];
  }

  for (const doc of allDocs) {
    const fm = doc.frontmatter as Record<string, unknown>;
    const deps = Array.isArray(fm.depends_on)
      ? (fm.depends_on as string[])
      : [];
    const refs = Array.isArray(fm.references)
      ? (fm.references as string[])
      : [];

    for (const target of deps) {
      const edge = {
        sourceConceptId: doc.conceptId,
        targetConceptId: target,
        relationType: "depends_on",
      };
      edges.push(edge);
      if (!nodeIds.has(target)) {
        brokenLinks.push(edge);
      } else {
        impactMap[target] = Array.from(
          new Set([...(impactMap[target] || []), doc.conceptId]),
        );
      }
    }

    for (const target of refs) {
      const edge = {
        sourceConceptId: doc.conceptId,
        targetConceptId: target,
        relationType: "references",
      };
      edges.push(edge);
      if (!nodeIds.has(target)) {
        brokenLinks.push(edge);
      } else {
        impactMap[target] = Array.from(
          new Set([...(impactMap[target] || []), doc.conceptId]),
        );
      }
    }
  }

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.sourceConceptId);
    connected.add(e.targetConceptId);
  }
  const orphanedConcepts = nodes
    .map((n) => n.conceptId)
    .filter((id) => !connected.has(id));

  const highlyConnectedConcepts = [...nodes]
    .map((n) => n.conceptId)
    .sort((a, b) => (impactMap[b]?.length || 0) - (impactMap[a]?.length || 0))
    .slice(0, 5);

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      brokenLinks,
      orphanedConcepts,
      highlyConnectedConcepts,
    },
    impactMap,
  };
}

export function GraphReport({ data: okfData }: GraphReportProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [simulateDeprecation, setSimulateDeprecation] =
    useState<boolean>(false);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch("/api/manifest/graph");
        if (!res.ok) {
          const fallback = buildClientFallbackGraph(okfData);
          if (fallback) {
            setData(fallback);
            setSelectedConcept(fallback.nodes?.[0]?.conceptId ?? null);
            return;
          }
          throw new Error(
            'Graph not found. Run "akcp graph build" to generate it.',
          );
        }
        const json = await res.json();
        setData(json);
        const firstId =
          json.nodes?.[0]?.conceptId ||
          Object.keys(json.impactMap || {})[0] ||
          null;
        setSelectedConcept(firstId);
      } catch (err: any) {
        const fallback = buildClientFallbackGraph(okfData);
        if (fallback) {
          setData(fallback);
          setSelectedConcept(fallback.nodes?.[0]?.conceptId ?? null);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [okfData]);

  const visualNodes = useMemo(() => {
    if (!data) return [];
    const rawIds =
      data.nodes && data.nodes.length > 0
        ? data.nodes.map((n) => ({
            id: n.conceptId,
            type: n.type || "Concept",
          }))
        : Object.keys(data.impactMap || {}).map((id) => ({
            id,
            type: "Concept",
          }));

    const count = rawIds.length;
    const cx = 360;
    const cy = 190;
    const radius = Math.min(140, Math.max(85, count * 16));

    return rawIds.map((item, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
      return {
        ...item,
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
      };
    });
  }, [data]);

  const visualEdges = useMemo(() => {
    if (!data) return [];
    if (data.edges && data.edges.length > 0) {
      return data.edges.map((e: any) => ({
        source: e.sourceConceptId ?? e.source,
        target: e.targetConceptId ?? e.target,
        relation: e.relationType ?? e.relation ?? "depends_on",
      }));
    }
    const derived: Array<{ source: string; target: string; relation: string }> =
      [];
    for (const [conceptId, downstream] of Object.entries(
      data.impactMap || {},
    )) {
      for (const dep of downstream) {
        derived.push({
          source: dep,
          target: conceptId,
          relation: "depends_on",
        });
      }
    }
    return derived;
  }, [data]);

  if (loading)
    return <div className="text-zinc-500">Loading Semantic Graph...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!data) return null;

  const activeImpacted = selectedConcept
    ? data.impactMap[selectedConcept] || []
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="text-neon-indigo" />
            Semantic Graph & Blast Radius Explorer
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Interactive dependency topology and transitive deprecation impact
            analysis across OKF Knowledge Concepts.
          </p>
        </div>

        <button
          onClick={() => setSimulateDeprecation((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            simulateDeprecation
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-lg"
              : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          {simulateDeprecation
            ? "Deprecation Cascade Simulation: ON"
            : "Simulate Stale / Deprecation Cascade"}
        </button>
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

      {/* Interactive SVG Topology & Blast Radius Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Interactive Concept Topology (Click a node to inspect blast
              radius)
            </h3>
            <span className="text-xs text-zinc-500">
              {visualNodes.length} Concepts Rendered
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 720 380"
              className="w-full h-[340px] select-none"
              role="img"
              aria-label="Semantic Knowledge Graph Topology"
            >
              {/* Directed Edges */}
              {visualEdges.map((edge, idx) => {
                const src = visualNodes.find((n) => n.id === edge.source);
                const tgt = visualNodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;
                const isHighlighted =
                  selectedConcept === edge.target ||
                  selectedConcept === edge.source ||
                  activeImpacted.includes(edge.source);
                return (
                  <line
                    key={idx}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={
                      isHighlighted
                        ? simulateDeprecation
                          ? "#f59e0b"
                          : "#6366f1"
                        : "#27272a"
                    }
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeDasharray={
                      edge.relation === "references" ? "4 4" : undefined
                    }
                  />
                );
              })}

              {/* Concept Nodes */}
              {visualNodes.map((node) => {
                const isSelected = selectedConcept === node.id;
                const isImpacted = activeImpacted.includes(node.id);
                const fill = isSelected
                  ? simulateDeprecation
                    ? "#ef4444"
                    : "#6366f1"
                  : isImpacted
                    ? "#f59e0b"
                    : "#18181b";
                const stroke = isSelected
                  ? "#ffffff"
                  : isImpacted
                    ? "#fbbf24"
                    : "#3f3f46";

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedConcept(node.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 22 : isImpacted ? 19 : 16}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y + 32}
                      textAnchor="middle"
                      fill={
                        isSelected
                          ? "#ffffff"
                          : isImpacted
                            ? "#fcd34d"
                            : "#a1a1aa"
                      }
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Blast Radius Side Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-neon-indigo" />
              Blast Radius Analysis
            </h3>

            {selectedConcept ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  <div className="text-xs text-zinc-500">Selected Concept</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {selectedConcept}
                  </div>
                </div>

                {simulateDeprecation && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                    <strong>Simulation Active:</strong> Marking{" "}
                    <code className="font-mono">{selectedConcept}</code> as{" "}
                    <code>deprecated</code> or <code>stale</code> will trigger
                    freshness warnings across{" "}
                    <strong>{activeImpacted.length}</strong> downstream
                    concepts.
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Downstream Impacted Concepts ({activeImpacted.length})
                  </div>
                  {activeImpacted.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Zero downstream dependents. Safe to modify or deprecate
                      without cascade effects.
                    </div>
                  ) : (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                      {activeImpacted.map((depId) => (
                        <li
                          key={depId}
                          onClick={() => setSelectedConcept(depId)}
                          className="text-xs font-mono px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center justify-between cursor-pointer hover:bg-amber-500/20"
                        >
                          <span>{depId}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Select a concept node in the graph to inspect its transitive
                blast radius.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Purple: Selected</span>
            <span>Amber: Downstream Impacted</span>
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
                onClick={() => setSelectedConcept(hc)}
                className="text-sm text-neon-blue bg-neon-blue/5 border border-neon-blue/10 p-2 rounded-lg cursor-pointer hover:bg-neon-blue/10 transition-colors"
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
