/**
 * @module components/kanban/KanbanBoard
 * @description Coordinates pipeline columns and structures columns for the Kanban board view.
 */

import type { ApplicationDoc } from "../../types/career.js";
import { KanbanColumn } from "./KanbanColumn.js";

interface KanbanBoardProps {
  applications: ApplicationDoc[];
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  // Define Pipeline Columns
  const columns = [
    { title: "Saved", status: "Saved" },
    { title: "Applied", status: "Applied" },
    { title: "Screening", status: "Screening" },
    { title: "Interviewing", status: "Interview" },
    { title: "Offers", status: "Offer" },
    { title: "Rejected", status: "Rejected" },
  ];

  // Group applications by status (case insensitive matching)
  const getAppsForColumn = (status: string) => {
    return applications.filter((app) => {
      const appStatus =
        (app.frontmatter.status as string | undefined)?.toLowerCase() || "";
      return appStatus === status.toLowerCase();
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header Info */}
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          Job Applications Kanban
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Monitor your active applications and track pipeline funnels.
        </p>
      </div>

      {/* Kanban columns overflow wrapper */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start select-none">
        {columns.map((col, i) => (
          <KanbanColumn
            key={i}
            title={col.title}
            status={col.status}
            applications={getAppsForColumn(col.status)}
          />
        ))}
      </div>
    </div>
  );
}
