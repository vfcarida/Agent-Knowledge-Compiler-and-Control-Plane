/**
 * @module components/kanban/KanbanCard
 * @description Renders details of a single job application with status badges and links.
 */

import { Calendar, MapPin, ExternalLink, DollarSign } from "lucide-react";
import type { ApplicationDoc } from "../../types/career.js";

interface KanbanCardProps {
  application: ApplicationDoc;
}

export function KanbanCard({ application }: KanbanCardProps) {
  const company = application.frontmatter.company as string | undefined;
  const position = application.frontmatter.position as string | undefined;
  const url = application.frontmatter.url as string | undefined;
  const platform = application.frontmatter.platform as string | undefined;
  const appliedAt = application.frontmatter.appliedAt as string | undefined;
  const salary = application.frontmatter.salary as string | undefined;
  const location = application.frontmatter.location as string | undefined;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getPlatformStyle = (plat?: string) => {
    const p = plat?.toLowerCase() || "";
    if (p.includes("linkedin"))
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (p.includes("gupy"))
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (p.includes("indeed"))
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    return "bg-zinc-800 text-zinc-400 border-zinc-700/50";
  };

  return (
    <div className="glass-panel glass-panel-hover p-5 rounded-xl cursor-grab active:cursor-grabbing select-none relative group overflow-hidden">
      {/* Background accent line on hover */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-neon-indigo to-neon-blue opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="font-semibold text-zinc-100 group-hover:text-neon-indigo transition-colors line-clamp-1 leading-snug">
            {position || "Unknown Role"}
          </h4>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            {company || "Unknown Company"}
          </p>
        </div>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900/60 transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Body Details */}
      <div className="space-y-2 mt-4 text-[11px] text-zinc-400">
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {salary && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span>{salary}</span>
          </div>
        )}

        {appliedAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span>Applied: {formatDate(appliedAt)}</span>
          </div>
        )}
      </div>

      {/* Card Footer badges */}
      {platform && (
        <div className="flex justify-between items-center mt-5 pt-3 border-t border-zinc-900/50">
          <span
            className={`text-[9px] px-2 py-0.5 rounded border uppercase font-semibold tracking-wider ${getPlatformStyle(platform)}`}
          >
            {platform}
          </span>
          <span className="text-[9px] text-zinc-600 font-semibold tracking-wider uppercase">
            {application.fileName.replace(/\.md$/, "")}
          </span>
        </div>
      )}
    </div>
  );
}
