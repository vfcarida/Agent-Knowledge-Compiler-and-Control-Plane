import { Package, Zap, Layers, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CareerBundleData } from '../../types/career.js';

interface TargetManifest {
  type: string;
  generatedFiles: string[];
  totalBytes: number;
}

interface AKCPManifest {
  version: string;
  timestamp: string;
  sourceHash: string;
  targets: TargetManifest[];
}

export function ContextPacks({ data }: { data: CareerBundleData | null }) {
  const [manifest, setManifest] = useState<AKCPManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const response = await fetch('/api/manifest');
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch manifest');
        }
        const manifestData = await response.json();
        setManifest(manifestData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchManifest();
  }, []);

  if (!data) return null;

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

      {loading ? (
        <div className="text-zinc-400">Loading manifest data...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Manifest Not Found</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : manifest ? (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-dark-border mb-4">
             <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2">Build Metadata</p>
             <div className="grid grid-cols-3 gap-4">
                <div><span className="text-zinc-500 text-xs block">Version</span><span className="text-zinc-200 font-mono text-sm">{manifest.version}</span></div>
                <div><span className="text-zinc-500 text-xs block">Timestamp</span><span className="text-zinc-200 text-sm">{new Date(manifest.timestamp).toLocaleString()}</span></div>
                <div><span className="text-zinc-500 text-xs block">Source Hash</span><span className="text-zinc-200 font-mono text-xs truncate block" title={manifest.sourceHash}>{manifest.sourceHash}</span></div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manifest.targets.map(target => (
              <div key={target.type} className="glass-panel p-6 rounded-2xl flex flex-col h-full border hover:border-neon-indigo/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-indigo/10 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-neon-indigo" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">{target.type}</h3>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-dark-border">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Generated Files</span>
                    <span className="text-lg font-bold text-zinc-200">{target.generatedFiles.length}</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-dark-border">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Size
                    </span>
                    <span className="text-lg font-bold text-zinc-200">{(target.totalBytes / 1024).toFixed(2)} KB</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 space-y-1">
                   <p className="font-semibold mb-2">Files:</p>
                   {target.generatedFiles.slice(0, 3).map((file, i) => (
                      <div key={i} className="truncate" title={file}>{file}</div>
                   ))}
                   {target.generatedFiles.length > 3 && (
                      <div className="italic text-zinc-600">+{target.generatedFiles.length - 3} more</div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
