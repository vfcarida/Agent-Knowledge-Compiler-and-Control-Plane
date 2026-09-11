import type { SemanticDiffResult } from "./types.js";

/**
 * Formats a semantic diff result as human-readable terminal output.
 */
export function formatAsText(diff: SemanticDiffResult): string {
  const lines: string[] = [];

  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";
  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const CYAN = "\x1b[36m";

  lines.push(`${BOLD}=== AKCP Semantic & Policy Diff ===${RESET}`);
  if (diff.baseBundleId && diff.targetBundleId) {
    lines.push(`Base: ${diff.baseBundleId} -> Target: ${diff.targetBundleId}`);
  }
  lines.push("");

  // Status banner
  if (diff.isBreaking) {
    lines.push(
      `${RED}${BOLD}✖ BREAKING CHANGES DETECTED (${diff.breakingReasons.length})${RESET}`,
    );
    for (const reason of diff.breakingReasons) {
      lines.push(`  ${RED}! ${reason}${RESET}`);
    }
    lines.push("");
  } else {
    lines.push(
      `${GREEN}${BOLD}✔ No breaking governance changes detected.${RESET}\n`,
    );
  }

  // Summary
  const { summary } = diff;
  lines.push(`${BOLD}Summary:${RESET}`);
  lines.push(
    `  Concepts:     ${GREEN}+${summary.addedConcepts}${RESET} / ${RED}-${summary.removedConcepts}${RESET} / ${YELLOW}~${summary.modifiedConcepts}${RESET}`,
  );
  lines.push(
    `  Capabilities: ${GREEN}+${summary.addedCapabilities}${RESET} / ${RED}-${summary.removedCapabilities}${RESET} / ${YELLOW}~${summary.modifiedCapabilities}${RESET}`,
  );
  lines.push(
    `  Links:        ${GREEN}+${summary.addedLinks}${RESET} / ${RED}-${summary.removedLinks}${RESET} (Broken: ${summary.brokenLinks > 0 ? RED : GREEN}${summary.brokenLinks}${RESET})`,
  );
  lines.push(
    `  Policies:     ${summary.policyChanges > 0 ? YELLOW : GREEN}${summary.policyChanges} rule change(s)${RESET}`,
  );
  lines.push("");

  // Detailed Concepts
  if (
    diff.concepts.added.length > 0 ||
    diff.concepts.removed.length > 0 ||
    diff.concepts.modified.length > 0
  ) {
    lines.push(`${BOLD}${CYAN}Concept Changes:${RESET}`);
    for (const c of diff.concepts.added) {
      lines.push(
        `  ${GREEN}+ [ADD] ${c.conceptId}${RESET} (${c.source?.filePath || c.type})`,
      );
    }
    for (const c of diff.concepts.removed) {
      lines.push(
        `  ${RED}- [DEL] ${c.conceptId}${RESET} (${c.source?.filePath || c.type})`,
      );
    }
    for (const c of diff.concepts.modified) {
      lines.push(`  ${YELLOW}~ [MOD] ${c.conceptId}${RESET}`);
      for (const ch of c.changes || []) {
        lines.push(
          `      • ${ch.field}: ${JSON.stringify(ch.oldValue)} -> ${JSON.stringify(ch.newValue)}`,
        );
      }
    }
    lines.push("");
  }

  // Detailed Capabilities
  if (diff.capabilities.length > 0) {
    lines.push(`${BOLD}${CYAN}Capability & Tool Changes:${RESET}`);
    for (const cap of diff.capabilities) {
      const prefix =
        cap.changeType === "added"
          ? `${GREEN}+ [ADD]`
          : cap.changeType === "removed"
            ? `${RED}- [DEL]`
            : `${YELLOW}~ [MOD]`;
      const breakingMarker = cap.isBreaking ? ` ${RED}[BREAKING]${RESET}` : "";
      lines.push(
        `  ${prefix} ${cap.capabilityId} (${cap.name})${breakingMarker}${RESET}`,
      );
      for (const ch of cap.changes || []) {
        lines.push(`      • ${ch.field}: ${ch.oldValue} -> ${ch.newValue}`);
      }
    }
    lines.push("");
  }

  // Detailed Policies
  if (diff.policies.length > 0) {
    lines.push(`${BOLD}${CYAN}Policy & Governance Changes:${RESET}`);
    for (const p of diff.policies) {
      const marker = p.isBreaking ? `${RED}[BREAKING] ` : "";
      lines.push(`  • ${marker}${p.description}${RESET}`);
    }
    lines.push("");
  }

  // Broken Links
  if (diff.links.broken.length > 0) {
    lines.push(`${BOLD}${RED}Broken Graph Links:${RESET}`);
    for (const l of diff.links.broken) {
      lines.push(
        `  ${RED}✖ ${l.sourceConceptId} -[${l.relationType}]-> ${l.targetConceptId} (target missing)${RESET}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Formats a semantic diff result as JSON string.
 */
export function formatAsJson(diff: SemanticDiffResult): string {
  return JSON.stringify(diff, null, 2);
}

/**
 * Formats a semantic diff result as a GitHub Flavored Markdown PR comment.
 */
export function formatAsMarkdown(diff: SemanticDiffResult): string {
  const lines: string[] = [];

  lines.push("## 🔍 AKCP Semantic & Governance Diff Report");
  lines.push("");

  if (diff.isBreaking) {
    lines.push("> [!CAUTION]");
    lines.push(
      `> **${diff.breakingReasons.length} Breaking Governance Change(s) Detected!** Review carefully before merging.`,
    );
    for (const reason of diff.breakingReasons) {
      lines.push(`> - ⚠️ ${reason}`);
    }
    lines.push("");
  } else {
    lines.push("> [!NOTE]");
    lines.push(
      "> **No Breaking Changes Detected.** Knowledge and policy changes are backwards-compatible.",
    );
    lines.push("");
  }

  const { summary } = diff;
  lines.push("### 📊 Change Summary");
  lines.push("");
  lines.push("| Category | Added | Removed | Modified | Breaking? |");
  lines.push("| :--- | :---: | :---: | :---: | :---: |");
  lines.push(
    `| **Concepts** | \`+${summary.addedConcepts}\` | \`-${summary.removedConcepts}\` | \`~${summary.modifiedConcepts}\` | ${summary.removedConcepts > 0 ? "⚠️ Yes" : "No"} |`,
  );
  lines.push(
    `| **Capabilities / Tools** | \`+${summary.addedCapabilities}\` | \`-${summary.removedCapabilities}\` | \`~${summary.modifiedCapabilities}\` | ${diff.capabilities.some((c) => c.isBreaking) ? "⚠️ Yes" : "No"} |`,
  );
  lines.push(
    `| **Graph Links** | \`+${summary.addedLinks}\` | \`-${summary.removedLinks}\` | Broken: \`${summary.brokenLinks}\` | ${summary.brokenLinks > 0 ? "⚠️ Yes" : "No"} |`,
  );
  lines.push(
    `| **Policies** | — | — | \`${summary.policyChanges}\` rule(s) | ${diff.policies.some((p) => p.isBreaking) ? "⚠️ Yes" : "No"} |`,
  );
  lines.push("");

  if (diff.capabilities.length > 0) {
    lines.push("### 🛠️ Capability & Tool Changes");
    lines.push("");
    lines.push("| Tool ID | Name | Action | Breaking? | Details |");
    lines.push("| :--- | :--- | :---: | :---: | :--- |");
    for (const cap of diff.capabilities) {
      const details =
        cap.changes && cap.changes.length > 0
          ? cap.changes
              .map(
                (c) =>
                  `\`${c.field}\`: ${String(c.oldValue)} → **${String(c.newValue)}**`,
              )
              .join(", ")
          : cap.breakingReason || "—";
      lines.push(
        `| \`${cap.capabilityId}\` | ${cap.name} | \`${cap.changeType.toUpperCase()}\` | ${cap.isBreaking ? "⚠️ **YES**" : "No"} | ${details} |`,
      );
    }
    lines.push("");
  }

  if (diff.policies.length > 0) {
    lines.push("### 🛡️ Policy & Governance Modifications");
    lines.push("");
    for (const p of diff.policies) {
      const alert = p.isBreaking ? "⚠️ " : "";
      lines.push(`- ${alert}**${p.field}**: ${p.description}`);
    }
    lines.push("");
  }

  if (
    diff.concepts.modified.length > 0 ||
    diff.concepts.added.length > 0 ||
    diff.concepts.removed.length > 0
  ) {
    lines.push("<details>");
    lines.push(
      "<summary><b>📄 Concept Details (Click to expand)</b></summary>",
    );
    lines.push("");
    if (diff.concepts.added.length > 0) {
      lines.push("**Added Concepts:**");
      for (const c of diff.concepts.added) {
        lines.push(
          `- \`+ [ADD]\` \`${c.conceptId}\` (${c.source?.filePath || c.type})`,
        );
      }
      lines.push("");
    }
    if (diff.concepts.removed.length > 0) {
      lines.push("**Removed Concepts:**");
      for (const c of diff.concepts.removed) {
        lines.push(
          `- \`- [DEL]\` \`${c.conceptId}\` (${c.source?.filePath || c.type})`,
        );
      }
      lines.push("");
    }
    if (diff.concepts.modified.length > 0) {
      lines.push("**Modified Concepts:**");
      for (const c of diff.concepts.modified) {
        lines.push(`- \`~ [MOD]\` \`${c.conceptId}\``);
        for (const ch of c.changes || []) {
          lines.push(
            `  - \`${ch.field}\`: \`${JSON.stringify(ch.oldValue)}\` → \`${JSON.stringify(ch.newValue)}\``,
          );
        }
      }
      lines.push("");
    }
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}
