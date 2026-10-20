import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Award,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { CareerBundleData } from "../../types/career.js";

interface OverviewDashboardProps {
  data: CareerBundleData;
}

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const totalDocs =
    data.skills.length +
    data.experiences.length +
    data.preferences.length +
    data.applications.length +
    data.other.length;

  const cards = [
    {
      label: "Total Knowledge Units",
      value: totalDocs,
      icon: FileText,
      accent: "text-neon-indigo",
    },
    {
      label: "Verified Skills",
      value: data.skills.length,
      icon: Award,
      accent: "text-neon-blue",
    },
    {
      label: "Experience Records",
      value: data.experiences.length,
      icon: Briefcase,
      accent: "text-neon-purple",
    },
    {
      label: "Audit Log Entries",
      value: data.logEntries.length,
      icon: Clock,
      accent: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-neon-indigo" />
            Control Plane Overview
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Summary of compiled OKF knowledge units, provenance manifest status,
            and runtime governance telemetry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-panel p-5 rounded-xl border border-dark-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className={`w-5 h-5 ${card.accent}`} />
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-6 rounded-xl border border-dark-border space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Compilation Provenance & Governance Posture</span>
        </div>
        {data.manifest ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-300 pt-2">
            <div>
              <span className="text-zinc-500 block text-xs">Bundle ID</span>
              <code className="text-zinc-200">
                {data.manifest.bundleId || "okf-bundle"}
              </code>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">Build Hash</span>
              <code className="text-zinc-200">
                {data.manifest.compileRunHash
                  ? String(data.manifest.compileRunHash).slice(0, 16)
                  : "verified"}
              </code>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">
                Conformance Level
              </span>
              <span className="text-emerald-400 font-medium">
                {data.manifest.conformance?.level || "Governed"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">
            Local OKF directory loaded directly. Run <code>akcp compile</code>{" "}
            to generate cryptographic provenance manifests (
            <code>akcp-manifest.json</code>).
          </p>
        )}
      </div>
    </div>
  );
}
