import { describe, it, expect } from "vitest";
import {
  buildWorkspaceConceptIndex,
  getWikiLinkCompletions,
  getConceptHoverMarkdown,
  getDocumentCodeLensSummary,
} from "../utils/workspace-index.js";

describe("VSCode Extension Workspace Concept Index, WikiLinks, Hover & CodeLens", () => {
  const sampleDocs = [
    {
      filePath: "/workspace/sources/payment-service.md",
      content: `---\nid: payment-service\ntitle: Payment Service\ntype: Service\nsensitivity: internal\nttlDays: 90\n---\n\nCore payment processing engine.`,
    },
    {
      filePath: "/workspace/sources/high-cpu-runbook.md",
      content: `---\nid: high-cpu-runbook\ntitle: High CPU Runbook\ntype: Runbook\nsensitivity: restricted\nttlDays: 30\n---\n\nMitigates CPU spikes on [[payment-service]].`,
    },
    {
      filePath: "/workspace/sources/inc-2026-01.md",
      content: `---\nid: inc-2026-01\ntitle: Checkout Latency Incident\ntype: Incident\nsensitivity: confidential\nttlDays: 14\n---\n\nResolved by following [[high-cpu-runbook]].`,
    },
  ];

  it("builds transitive downstream impactMap across workspace documents", () => {
    const index = buildWorkspaceConceptIndex(sampleDocs);
    expect(index.concepts.size).toBe(3);
    // payment-service is referenced by high-cpu-runbook, which is referenced by inc-2026-01
    expect(index.impactMap["payment-service"]).toEqual([
      "high-cpu-runbook",
      "inc-2026-01",
    ]);
    expect(index.impactMap["high-cpu-runbook"]).toEqual(["inc-2026-01"]);
    expect(index.impactMap["inc-2026-01"]).toEqual([]);
  });

  it("provides WikiLink completions when typing [[", () => {
    const index = buildWorkspaceConceptIndex(sampleDocs);
    const allCompletions = getWikiLinkCompletions("See [[", index);
    expect(allCompletions).toHaveLength(3);

    const filtered = getWikiLinkCompletions("Check [[pay", index);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.label).toBe("payment-service");
    expect(filtered[0]!.insertText).toBe("payment-service]]");
    expect(filtered[0]!.detail).toContain("blast radius: 2");
  });

  it("generates rich hover Markdown and CodeLens summary", () => {
    const index = buildWorkspaceConceptIndex(sampleDocs);
    const hover = getConceptHoverMarkdown("[[payment-service]]", index);
    expect(hover).toContain("AKCP Concept: `payment-service`");
    expect(hover).toContain("2 concept(s) (high-cpu-runbook, inc-2026-01)");

    const lens = getDocumentCodeLensSummary(
      sampleDocs[0]!.content,
      sampleDocs[0]!.filePath,
      index,
    );
    expect(lens).toContain("Type: Service");
    expect(lens).toContain("Sensitivity: internal");
    expect(lens).toContain("Blast Radius: 2 downstream");
  });
});
