/**
 * @module App
 * @description Master entrypoint and router dashboard component.
 */

import { useState } from "react";
import { MainLayout } from "./components/layout/MainLayout.js";
import { ApprovalQueue } from "./components/approvals/ApprovalQueue.js";
import { SystemHealth } from "./components/system/SystemHealth.js";
import { EvalsSummary } from "./components/evals/EvalsSummary.js";
import { useOKFData } from "./hooks/use-okf-data.js";
import { FolderOpen, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

import { AuditLog } from "./components/audit/AuditLog.js";
import { Documents } from "./components/documents/Documents.js";
import { ContextPacks } from "./components/packs/ContextPacks.js";
import { GraphReport } from "./components/packs/GraphReport.js";
import { MCPCapabilities } from "./components/mcp/MCPCapabilities.js";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("health");
  const { data, loading, error, loadFromFiles, loadFromDirectory } =
    useOKFData();

  // Handle Directory Picker selection
  const handleDirectoryPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const handle = await (window as any).showDirectoryPicker();
        await loadFromDirectory(handle);
      } else {
        alert(
          "Directory Picker is only supported in modern Chromium browsers. Try drag-dropping or select directory via input.",
        );
      }
    } catch (err) {
      console.error("[App] Directory picker cancelled or failed:", err);
    }
  };

  const renderActiveTab = () => {
    if (!data) return null;
    switch (currentTab) {
      case "overview":
        return <div className="text-zinc-400">Overview Placeholder</div>;
      case "health":
        return <SystemHealth />;
      case "documents":
        return <Documents data={data} />;
      case "packs":
        return <ContextPacks data={data} />;
      case "graph":
        return <GraphReport />;
      case "mcp":
        return <MCPCapabilities />;
      case "approvals":
        return <ApprovalQueue />;
      case "audit":
        return <AuditLog />;
      case "evals":
        return <EvalsSummary />;
      case "governance":
        return (
          <div className="text-zinc-400">Governance Policies Placeholder</div>
        );
      case "settings":
        return <div className="text-zinc-400">Settings Placeholder</div>;
      default:
        return <div className="text-zinc-400">Placeholder</div>;
    }
  };

  return (
    <MainLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      data={data}
      loading={loading}
      error={error}
      loadFromFiles={loadFromFiles}
      loadFromDirectory={loadFromDirectory}
    >
      {data ? (
        renderActiveTab()
      ) : (
        /* Welcome Loading Dashboard State */
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center">
          {/* Logo container */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-neon-indigo/20 blur-xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-tr from-neon-indigo via-neon-blue to-neon-purple rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
              <Cpu className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
            Welcome to Agent Knowledge Compiler and Control Plane
          </h2>
          <p className="text-zinc-400 text-sm max-w-lg mb-10 leading-relaxed">
            The open-source compiler and control plane for turning organizational
            knowledge into versioned, governed, cost-efficient, agent-consumable artifacts.
          </p>

          {/* Cards for features */}
          <div className="grid grid-cols-2 gap-6 w-full mb-10 text-left">
            <div className="glass-panel p-6 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-neon-blue mb-3" />
              <h4 className="font-semibold text-zinc-100 mb-1">
                Zero-Trust Governance
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Strict boundaries for agentic execution. Machine-readable policy
                cards and HITL (Human-In-The-Loop) gateways ensure absolute control
                over agent side-effects.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-neon-purple mb-3" />
              <h4 className="font-semibold text-zinc-100 mb-1">
                Local Directory Parsing
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamlessly index your local <code>.okf</code> markdown catalog
                on the fly directly inside your browser container.
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleDirectoryPicker}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-neon-indigo to-neon-blue hover:from-neon-indigo/90 hover:to-neon-blue/90 border border-white/10 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            Select .okf Directory
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </MainLayout>
  );
}
