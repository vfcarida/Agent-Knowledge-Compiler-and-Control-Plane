/**
 * @module components/kanban/KanbanColumn
 * @description Renders a single stage column of the job application Kanban pipeline.
 */

import type { ApplicationDoc } from "../../types/career.js";
import { KanbanCard } from "./KanbanCard.js";

interface KanbanColumnProps {
  title: string;
  status: string;
  applications: ApplicationDoc[];
}

export function KanbanColumn({
  title,
  status,
  applications,
}: KanbanColumnProps) {
  // Column Styles based on Pipeline Stage
  const getHeaderStyles = (colStatus: string) => {
    switch (colStatus.toLowerCase()) {
      case "saved":
        return "border-l-zinc-500 text-zinc-400";
      case "applied":
        return "border-l-neon-indigo text-indigo-400";
      case "screening":
        return "border-l-sky-400 text-sky-400";
      case "interview":
        return "border-l-neon-blue text-cyan-400";
      case "offer":
        return "border-l-emerald-400 text-emerald-400";
      case "rejected":
        return "border-l-rose-500 text-rose-400";
      case "withdrawn":
        return "border-l-orange-500 text-orange-400";
      default:
        return "border-l-zinc-700 text-zinc-500";
    }
  };

  const getHeaderDot = (colStatus: string) => {
    switch (colStatus.toLowerCase()) {
      case "saved":
        return "bg-zinc-500";
      case "applied":
        return "bg-neon-indigo";
      case "screening":
        return "bg-sky-400";
      case "interview":
        return "bg-neon-blue";
      case "offer":
        return "bg-emerald-400";
      case "rejected":
        return "bg-rose-500";
      case "withdrawn":
        return "bg-orange-500";
      default:
        return "bg-zinc-700";
    }
  };

  return (
    <div className="flex-1 min-w-[300px] flex flex-col h-full bg-zinc-950/20 rounded-2xl border border-dark-border/40 p-4">
      {/* Column Title and count */}
      <div
        className={`flex items-center justify-between border-l-2 pl-3 ${getHeaderStyles(status)} mb-5`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${getHeaderDot(status)}`} />
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            {title}
          </h3>
        </div>
        <span className="bg-zinc-900/60 border border-dark-border text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
          {applications.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {applications.length > 0 ? (
          applications.map((app, index) => (
            <KanbanCard key={index} application={app} />
          ))
        ) : (
          <div className="h-32 rounded-xl border border-dashed border-zinc-800/60 flex items-center justify-center text-xs text-zinc-600">
            No applications
          </div>
        )}
      </div>
    </div>
  );
}
