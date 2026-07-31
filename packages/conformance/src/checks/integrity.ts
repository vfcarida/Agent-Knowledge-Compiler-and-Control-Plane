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

  // NOTE: this check only verifies link-reference integrity (below) — it does NOT
  // do SHA-256 artifact-hash verification. That's a materially different check
  // (comparing compiled outputs on disk against a BuildManifest's recorded
  // hashes) already implemented separately in provenance/verify.ts's
  // verifyManifest(), which this function doesn't call: checkIntegrity() only
  // receives the in-memory AgentKnowledgeIR, not a manifest or bundle root, so
  // it has no artifact paths to hash. Wiring real hash verification in here
  // would mean threading a manifest path through ConformanceRunner — a bigger
  // change than a docs/naming fix, so it's left as a known gap rather than
  // silently claimed as done.

  // Cross-reference integrity: links in knowledge graph point to existing concepts
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
