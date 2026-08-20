import type { PolicyCard } from "../policy/types.js";
import type {
  PolicyRule,
  PolicyObligation,
  PolicyCondition,
} from "./engine.js";

export function normalizeConditions(
  condition: unknown,
): PolicyCondition[] | undefined {
  if (condition === null || condition === undefined) {
    return undefined;
  }

  if (Array.isArray(condition)) {
    const list: PolicyCondition[] = [];
    for (const item of condition) {
      const normalized = normalizeSingleCondition(item);
      if (normalized) {
        list.push(...normalized);
      }
    }
    return list.length > 0 ? list : undefined;
  }

  const normalized = normalizeSingleCondition(condition);
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeSingleCondition(
  item: unknown,
): PolicyCondition[] | undefined {
  if (item === null || item === undefined) return undefined;

  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.type === "string") {
      const type = obj.type as PolicyCondition["type"];
      let params: Record<string, unknown> = {};
      if (obj.params && typeof obj.params === "object") {
        params = obj.params as Record<string, unknown>;
      } else {
        const { type: _, ...rest } = obj;
        params = rest;
      }
      return [{ type, params }];
    }

    if ("environment" in obj && typeof obj.environment === "string") {
      return [
        { type: "environment", params: { environment: obj.environment } },
      ];
    }

    if ("startHour" in obj || "endHour" in obj) {
      return [
        {
          type: "time_window",
          params: {
            startHour:
              typeof obj.startHour === "number" ? obj.startHour : undefined,
            endHour: typeof obj.endHour === "number" ? obj.endHour : undefined,
          },
        },
      ];
    }

    return [{ type: "unknown", params: obj }];
  }

  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) return undefined;

    // Try parsing as JSON
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeConditions(parsed);
      } catch {
        // Fall through to string parsing
      }
    }

    // Compound conditions joined by && or AND
    const compoundParts = trimmed.split(/\s*(?:&&|\bAND\b|\band\b)\s*/);
    if (compoundParts.length > 1) {
      const list: PolicyCondition[] = [];
      for (const part of compoundParts) {
        const parsed = normalizeSingleConditionString(part.trim());
        if (parsed) list.push(parsed);
      }
      return list.length > 0 ? list : undefined;
    }

    const single = normalizeSingleConditionString(trimmed);
    return single ? [single] : undefined;
  }

  return [{ type: "unknown", params: { raw: item } }];
}

function normalizeSingleConditionString(str: string): PolicyCondition {
  const trimmed = str.trim();

  // 1. approval_exists
  if (
    /^approval_exists(?:\(\))?(?:\s*==\s*true)?$/i.test(trimmed) ||
    /^approvalExists(?:\(\))?$/i.test(trimmed)
  ) {
    return { type: "approval_exists", params: {} };
  }

  // 2. environment
  const envMatch =
    trimmed.match(
      /^environment\s*(?:==|=|:)\s*['"]?([a-zA-Z0-9_\-.]+)['"]?$/i,
    ) ||
    trimmed.match(/^environment\s*\(\s*['"]?([a-zA-Z0-9_\-.]+)['"]?\s*\)$/i) ||
    trimmed.match(/^env\s*(?:==|=|:)\s*['"]?([a-zA-Z0-9_\-.]+)['"]?$/i);
  if (envMatch && envMatch[1]) {
    return { type: "environment", params: { environment: envMatch[1] } };
  }

  // 3. time_window
  if (/^time_window(?:\(\))?$/i.test(trimmed)) {
    return { type: "time_window", params: {} };
  }
  const twPosMatch = trimmed.match(
    /^time_window\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  );
  if (twPosMatch && twPosMatch[1] && twPosMatch[2]) {
    return {
      type: "time_window",
      params: {
        startHour: parseInt(twPosMatch[1], 10),
        endHour: parseInt(twPosMatch[2], 10),
      },
    };
  }
  const twColonMatch = trimmed.match(
    /^time_window\s*:\s*(\d+)\s*(?:-|..)\s*(\d+)$/i,
  );
  if (twColonMatch && twColonMatch[1] && twColonMatch[2]) {
    return {
      type: "time_window",
      params: {
        startHour: parseInt(twColonMatch[1], 10),
        endHour: parseInt(twColonMatch[2], 10),
      },
    };
  }
  const twNamedMatch = trimmed.match(/^time_window\s*\((.*)\)$/i);
  if (twNamedMatch && twNamedMatch[1]) {
    const inside = twNamedMatch[1];
    const startMatch = inside.match(/start(?:Hour)?\s*[=:]\s*(\d+)/i);
    const endMatch = inside.match(/end(?:Hour)?\s*[=:]\s*(\d+)/i);
    if (startMatch || endMatch) {
      return {
        type: "time_window",
        params: {
          startHour:
            startMatch && startMatch[1]
              ? parseInt(startMatch[1], 10)
              : undefined,
          endHour:
            endMatch && endMatch[1] ? parseInt(endMatch[1], 10) : undefined,
        },
      };
    }
  }

  // 4. custom
  if (/^custom(?:\(.*\))?$/i.test(trimmed)) {
    return { type: "custom", params: {} };
  }

  // 5. Unknown condition type -> fail closed
  return { type: "unknown", params: { raw: trimmed } };
}

export function adaptPolicyCardToRules(policy: PolicyCard): PolicyRule[] {
  const rules: PolicyRule[] = [];
  let priority = 100; // start at 100

  const piiHandling = policy.spec?.piiHandling || "deny";
  const obligations: PolicyObligation[] = [];
  if (piiHandling === "redact") obligations.push({ type: "pii_redact" });
  if (piiHandling === "deny") obligations.push({ type: "pii_deny" });

  const baseId = policy.id || policy.metadata?.name || "unknown-policy";

  // V2 Rules
  if (policy.appliesTo?.capabilities && policy.rules) {
    const scopes = policy.appliesTo.capabilities;
    const riskLevels = policy.appliesTo.riskLevels;
    for (const rule of policy.rules) {
      const conditions = rule.condition
        ? normalizeConditions(rule.condition)
        : undefined;
      if (rule.effect === "deny") {
        rules.push({
          id: `${baseId}-v2-deny-${priority}`,
          priority: priority++,
          effect: "deny",
          match: { tools: scopes, riskLevels },
          conditions,
          description: `V2 Deny rule from ${policy.metadata?.name}`,
        });
      } else {
        const obs = [...obligations];
        if (rule.effect === "require_approval")
          obs.push({ type: "require_approval" });
        rules.push({
          id: `${baseId}-v2-allow-${priority}`,
          priority: priority++,
          effect: "allow",
          match: { tools: scopes, riskLevels },
          conditions,
          obligations: obs,
          description: `V2 Allow rule from ${policy.metadata?.name}`,
        });
      }
    }
  }

  const spec = policy.spec;
  if (!spec) return rules;

  // 1. Forbidden tools -> High priority deny
  if (spec.forbiddenTools && spec.forbiddenTools.length > 0) {
    rules.push({
      id: `${baseId}-forbidden-tools`,
      priority: priority++,
      effect: "deny",
      match: { tools: spec.forbiddenTools },
      description: `Forbidden tools from ${policy.metadata?.name}`,
    });
  }

  // Approval requirements per tool (overrides side effect if specific)
  if (spec.approvalRequirements && spec.approvalRequirements.length > 0) {
    const obs = [...obligations, { type: "require_approval" as const }];
    rules.push({
      id: `${baseId}-approval-reqs`,
      priority: priority++,
      effect: "allow",
      match: { tools: spec.approvalRequirements },
      obligations: obs,
      description: `Approval requirements from ${policy.metadata?.name}`,
    });
  }

  // 2. Side Effect Rules
  const sideEffectRules = spec.sideEffectRules || {
    read: "allow",
    write: "approval",
    submit: "approval",
  };

  const mapSideEffect = (effect: string, action: string) => {
    if (action === "deny") {
      rules.push({
        id: `${baseId}-sideeffect-deny-${effect}`,
        priority: priority++,
        effect: "deny",
        match: { tools: spec.allowedTools, sideEffects: [effect] },
      });
    } else {
      const obs = [...obligations];
      if (action === "approval") obs.push({ type: "require_approval" });
      rules.push({
        id: `${baseId}-sideeffect-allow-${effect}`,
        priority: priority++,
        effect: "allow",
        match: { tools: spec.allowedTools, sideEffects: [effect] },
        obligations: obs,
      });
    }
  };

  mapSideEffect("read", sideEffectRules.read);
  mapSideEffect("write", sideEffectRules.write);
  mapSideEffect("submit", sideEffectRules.submit);

  return rules;
}
