/**
 * @module components/layout/Sidebar
 * @description Sidebar navigation and real-time statistics aggregator.
 */

import {
  LayoutDashboard,
  Activity,
  FileText,
  Package,
  Wrench,
  ShieldCheck,
  ScrollText,
  LineChart,
  Scale,
  Settings,
  Network,
} from "lucide-react";
import type { CareerBundleData } from "../../types/career.js";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  data: CareerBundleData | null;
}

export function Sidebar({ currentTab, setCurrentTab, data }: SidebarProps) {
  // Aggregate Stats (AKCP metrics)
  const totalDocs = data?.applications.length ?? 0 + (data?.skills.length ?? 0);

  const stats = [
    {
      label: "Bundle Size",
      value: `${totalDocs} docs`,
      color: "text-neon-indigo",
    },
    { label: "Risk Level", value: "Low", color: "text-emerald-400" },
  ];

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "health", label: "Bundle Health", icon: Activity },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "packs", label: "Context Packs", icon: Package },
    { id: "graph", label: "Graph & Impact", icon: Network },
    { id: "mcp", label: "MCP Capabilities", icon: Wrench },
    { id: "approvals", label: "Approvals", icon: ShieldCheck },
    { id: "audit", label: "Audit Log", icon: ScrollText },
    { id: "evals", label: "Evals", icon: LineChart },
    { id: "governance", label: "Governance Policies", icon: Scale },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-80 border-r border-dark-border bg-black/40 flex flex-col h-screen overflow-y-auto">
      {/* Brand Header */}
      <div className="p-8 border-b border-dark-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-indigo via-neon-blue to-neon-purple bg-clip-text text-transparent tracking-tight">
          AKCP
        </h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
          Operator Console
        </p>
      </div>

      {/* Stats Widget */}
      <div className="p-6 border-b border-dark-border bg-zinc-950/20">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Bundle Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass-panel p-3 rounded-lg flex flex-col justify-between"
            >
              <span className="text-[10px] text-zinc-500 font-medium leading-tight">
                {stat.label}
              </span>
              <span className={`text-xl font-bold ${stat.color} mt-2`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-4 mb-4">
          Navigation
        </h3>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-neon-indigo/10 border border-neon-indigo/30 text-indigo-200"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 border border-transparent"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-neon-indigo" : "text-zinc-500"}`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-dark-border text-center text-xs text-zinc-600 bg-zinc-950/10">
        <p>Open Knowledge Format v0.1</p>
        <p className="mt-1 text-[10px]">Privacy-by-Design Local Mode</p>
      </div>
    </aside>
  );
}
