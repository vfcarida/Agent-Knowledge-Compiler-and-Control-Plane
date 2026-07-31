import type { AgentKnowledgeIR } from "@akcp/core";
import type { CheckResult } from "../types.js";

export async function checkLifecycleConsistency(
  ir: AgentKnowledgeIR,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const concept of ir.concepts) {
    // Lifecycle state must be valid
    const validStates = ["draft", "active", "deprecated", "archived"];
    // IRConcept's actual lifecycle field is `status` (see ir/schema.ts's
    // IRConceptSchema) — this used to read a nonexistent `concept.lifecycle.state`
    // path, which meant every concept was silently treated as "active" regardless
    // of its real status, and the "no-active-depends-on-deprecated" check below
    // could never fire. `status` is optional in the schema, so 'active' remains a
    // reasonable default only when it's genuinely unset.
    const lifecycleState = concept.status || "active";

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

        const depState = dependentConcept?.status || "active";
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
