import { FileText, Database, Calendar } from "lucide-react";
import type { CareerBundleData } from "../../types/career.js";

export function Documents({ data }: { data: CareerBundleData | null }) {
  if (!data) return null;

  const docs = [
    ...data.skills.map((s) => ({
      id: s.conceptId,
      type: "skill",
      name: (s.frontmatter as any).name as string,
      date: (s.frontmatter as any).lastUpdated as string,
    })),
    ...data.applications.map((a) => ({
      id: a.conceptId,
      type: "application",
      name: a.company,
      date: new Date().toISOString(),
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-neon-indigo" />
            Bundle Documents
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Raw OKF Markdown files currently available in the `.agent-context`
            bundle.
          </p>
        </div>
        <div className="bg-zinc-900 border border-dark-border px-4 py-2 rounded-lg flex items-center gap-2">
          <Database className="w-4 h-4 text-neon-blue" />
          <span className="text-sm text-zinc-300 font-medium">
            {docs.length} Documents
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="glass-panel p-5 rounded-xl hover:border-neon-indigo/50 transition-colors cursor-default"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="px-2 py-1 bg-neon-indigo/10 text-neon-indigo border border-neon-indigo/20 rounded text-[10px] font-semibold uppercase tracking-wider">
                {doc.type}
              </span>
              <FileText className="w-4 h-4 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 truncate">
              {doc.name}
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
              {doc.id}.md
            </p>
            <div className="mt-4 pt-3 border-t border-dark-border flex items-center gap-2 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              {doc.date
                ? new Date(doc.date).toLocaleDateString()
                : "Unknown Date"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
