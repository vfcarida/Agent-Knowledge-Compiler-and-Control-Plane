import { compile } from "@akcp/core";
import type { CheckResult } from "../types.js";

// A simple deep equal to compare objects without pulling in heavy dependencies

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

function normalizeForComparison(ir: any): unknown {
  // Remove fields that are expected to differ (like compiledAt timestamps)
  if (!ir) return ir;
  const normalized = { ...ir };

  if (normalized.metadata) {
    normalized.metadata = { ...normalized.metadata };
    delete normalized.metadata.compiledAt;
  }

  // Also iterate concepts and remove dynamic properties if any exist in the future
  return normalized;
}

export async function checkCompilationIdempotency(
  bundlePath: string,
): Promise<CheckResult> {
  const result1 = await compile(bundlePath, { targets: [] });
  const result2 = await compile(bundlePath, { targets: [] });

  if (!result1.ok || !result2.ok) {
    return {
      check: "compilation-idempotency",
      passed: false,
      message: "Compilation failed during idempotency check",
    };
  }

  // Compare IR outputs (ignoring timestamps if present)
  const ir1 = normalizeForComparison(result1.value.ir);
  const ir2 = normalizeForComparison(result2.value.ir);

  const identical = deepEqual(ir1, ir2);

  return {
    check: "compilation-idempotency",
    passed: identical,
    message: identical
      ? "Compilation is deterministic"
      : "Compilation produced different results on second run",
  };
}
