import type { ScorecardReport } from "@akcp/core";

export function formatScorecardMarkdown(report: ScorecardReport): string {
  let md = `# Agent Knowledge Readiness Scorecard\n\n`;
  md += `**Bundle ID**: \`${report.bundleId}\`\n`;
  md += `**Timestamp**: \`${report.timestamp}\`\n`;
  md += `**Total Score**: ${report.totalScore} / ${report.maxTotalScore}\n\n`;

  md += `## Dimensions\n\n`;
  md += `| Dimension | Score | Details |\n`;
  md += `|-----------|-------|---------|\n`;

  for (const dim of report.dimensions) {
    const details = dim.details.join(" ");
    md += `| **${dim.dimension}** | ${dim.score}/${dim.maxScore} | ${details} |\n`;
  }

  md += `\n## Recommendations\n\n`;
  if (report.recommendations.length === 0) {
    md += `Great job! Your bundle is fully optimized for agent readiness.\n`;
  } else {
    for (const rec of report.recommendations) {
      const emoji =
        rec.impact === "high" ? "🚨" : rec.impact === "medium" ? "⚠️" : "💡";
      md += `- ${emoji} **[${rec.dimension}]**: ${rec.action}\n`;
    }
  }

  return md;
}
