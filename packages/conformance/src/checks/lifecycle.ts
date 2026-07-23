import type { AgentKnowledgeIR } from "@akcp/core";
import type { CheckResult } from "../types.js";

export async function checkLifecycleConsistency(
  ir: AgentKnowledgeIR,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const concept of ir.concepts) {
    // Lifecycle state must be valid
    const validStates = ["draft", "active", "deprecated", "archived"];
    // Assuming the IR concept has frontmatter or properties where lifecycle is stored
    // Under OKF, lifecycle might be under `properties.lifecycle` or similar, but the IR types
    // map it. If it doesn't exist, we assume 'active' for the sake of the check.
    // The exact type might vary based on how buildKnowledgeIR maps it.
    // We'll use a loose cast to check if there's a lifecycle state explicitly.

    const lifecycleState = (concept as any).lifecycle?.state || "active";

    results.push({
      check: "lifecycle-state-valid",
      target: concept.conceptId,
      passed: validStates.includes(lifecycleState),
      message: !validStates.includes(lifecycleState)
        ? `Invalid lifecycle state: ${lifecycleState}`
        : undefined,
    });

    // Deprecated concepts should not be primary dependencies of active concepts
    if (lifecycleState === "deprecated") {
      const dependents = (ir.links || [])
        .filter((l) => l.targetConceptId === concept.conceptId)
        .map((l) => l.sourceConceptId);

      const activeDependents = dependents.filter((id) => {
        const dependentConcept = ir.concepts.find((c) => c.conceptId === id);

        const depState =
          (dependentConcept as any)?.lifecycle?.state || "active";
        return depState === "active";
      });

      results.push({
        check: "no-active-depends-on-deprecated",
        target: concept.conceptId,
        passed: activeDependents.length === 0,
        message:
          activeDependents.length > 0
            ? `Active concepts depend on deprecated "${concept.conceptId}": ${activeDependents.join(", ")}`
            : undefined,
      });
    }
  }

  // If there are no concepts, add a placeholder pass
  if (ir.concepts.length === 0) {
    results.push({
      check: "lifecycle-consistency",
      target: "bundle",
      passed: true,
      message: "No concepts to check",
    });
  }

  return results;
}
