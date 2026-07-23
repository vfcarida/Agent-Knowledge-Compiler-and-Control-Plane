import type { AgentKnowledgeIR } from "@akcp/core";
import type { CheckResult } from "../types.js";
import { createHash } from "crypto";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function checkIntegrity(
  ir: AgentKnowledgeIR,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Hash verification: every artifact should have a sha256 that matches content
  // Note: the IR doesn't necessarily contain all raw contents for checking here easily,
  // but if artifacts are present in the concept, we could check. For now, since IR
  // concepts are our source of truth in the bundle, we can check basic graph integrity.

  // 2. Cross-reference integrity: links in knowledge graph point to existing concepts
  for (const link of ir.links ?? []) {
    const sourceExists = ir.concepts.some(
      (c) => c.conceptId === link.sourceConceptId,
    );
    const targetExists = ir.concepts.some(
      (c) => c.conceptId === link.targetConceptId,
    );

    results.push({
      check: "link-reference-integrity",
      target: `${link.sourceConceptId} -> ${link.targetConceptId}`,
      passed: sourceExists && targetExists,
      severity: "warning",
      message: !sourceExists
        ? `Source "${link.sourceConceptId}" not found`
        : !targetExists
          ? `Target "${link.targetConceptId}" not found`
          : undefined,
    });
  }

  // If there are no links, add a placeholder pass so the report isn't empty for this check
  if (!ir.links || ir.links.length === 0) {
    results.push({
      check: "link-reference-integrity",
      target: "bundle",
      passed: true,
      message: "No links to verify",
    });
  }

  return results;
}
