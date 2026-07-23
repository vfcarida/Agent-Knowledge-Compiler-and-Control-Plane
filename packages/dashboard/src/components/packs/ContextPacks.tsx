import { Package, Zap, Layers, AlertTriangle } from "lucide-react";

import type { CareerBundleData } from "../../types/career.js";

interface TargetManifest {
  name: string;
  status: string;
  outputs: string[];
  sizeBytes: number;
  hash: string;
}

interface AKCPManifest {
  schemaVersion: string;
  createdAt: string;
  buildId: string;
  source: { root: string; config: string; hash: string };
  compiler: { name: string; version: string };
  targets: TargetManifest[];
  diagnostics: any[];
  conformance: { level: string; checks: any[] };
}

export function ContextPacks({ data }: { data: CareerBundleData | null }) {
  if (!data) return null;

  const manifest = data.manifest as AKCPManifest | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-neon-indigo" />
            Compiled Targets (Manifest)
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Visual inspection of the generated Agent-Ready targets.
          </p>
        </div>
      </div>

      {!manifest ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Manifest Not Found</h4>
            <p className="text-sm mt-1">
              Could not find <code>akcp-manifest.json</code> in the loaded directory or <code>dist/</code> folder. 
              Make sure you have compiled the context pack.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-dark-border mb-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2">
              Build Metadata
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-zinc-500 text-xs block">Version</span>
                <span className="text-zinc-200 font-mono text-sm">
                  {manifest.compiler?.version || manifest.schemaVersion}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs block">Timestamp</span>
                <span className="text-zinc-200 text-sm">
                  {new Date(manifest.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs block">Source Hash</span>
                <span
                  className="text-zinc-200 font-mono text-xs truncate block"
                  title={manifest.source?.hash}
                >
                  {manifest.source?.hash}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manifest.targets.map((target) => (
              <div
                key={target.name}
                className="glass-panel p-6 rounded-2xl flex flex-col h-full border hover:border-neon-indigo/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-indigo/10 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-neon-indigo" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">
                        {target.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-dark-border">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                      Generated Files
                    </span>
                    <span className="text-lg font-bold text-zinc-200">
                      {target.outputs.length}
                    </span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-dark-border">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Size
                    </span>
                    <span className="text-lg font-bold text-zinc-200">
                      {(target.sizeBytes / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 space-y-1">
                  <p className="font-semibold mb-2">Files:</p>
                  {target.outputs.slice(0, 3).map((file, i) => (
                    <div key={i} className="truncate" title={file}>
                      {file}
                    </div>
                  ))}
                  {target.outputs.length > 3 && (
                    <div className="italic text-zinc-600">
                      +{target.outputs.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
