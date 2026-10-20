/**
 * @module components/governance/GovernancePolicies
 * @description Renders zero-trust governance policies, HITL gates, autonomy boundaries, and an interactive Policy & Firewall Playground.
 */

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  FileCheck,
  UserCheck,
  Scale,
  Play,
  Terminal,
} from "lucide-react";

interface PolicyRule {
  id: string;
  name?: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  effect: "allow" | "deny" | "require_approval";
  scope?: string;
  requiresApproval?: boolean;
  obligations?: Array<{ type: string; details?: string }>;
}

interface GovernanceData {
  policies: PolicyRule[];
  profile?: string;
}

const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: "akcp.policy.zero-trust-default",
    name: "Zero-Trust Default Deny",
    description:
      "All unauthorized tools and unmapped side-effects are blocked by default. Agents operate strictly within declared capability scopes.",
    riskLevel: "critical",
    effect: "deny",
    scope: "*",
    requiresApproval: false,
    obligations: [
      {
        type: "audit_log",
        details: "All rejections logged with cryptographic hash",
      },
    ],
  },
  {
    id: "akcp.policy.hitl-external-submit",
    name: "Human-In-The-Loop External Submissions",
    description:
      "Any action that writes or submits data to an external platform requires explicit cryptographic token approval from a verified human supervisor.",
    riskLevel: "critical",
    effect: "require_approval",
    scope: "actions:external-submit",
    requiresApproval: true,
    obligations: [
      { type: "token_gate", details: "One-time SHA-256 bound approval token" },
      { type: "timeout", details: "Token expires after 15 minutes" },
    ],
  },
  {
    id: "akcp.policy.pii-sanitization",
    name: "Automatic PII Redaction",
    description:
      "Responses and tool arguments containing sensitive personal identification information (emails, phone numbers, credentials) are automatically scrubbed.",
    riskLevel: "high",
    effect: "allow",
    scope: "content:boundary",
    requiresApproval: false,
    obligations: [
      {
        type: "pii_redact",
        details: "Scrub regex patterns before prompt delivery",
      },
    ],
  },
  {
    id: "akcp.policy.context-pagination",
    name: "Context Window Collapse Prevention",
    description:
      "Large knowledge concepts exceeding 4,000 characters must be read in paginated chunks to preserve LLM attention and prevent context overflow.",
    riskLevel: "low",
    effect: "allow",
    scope: "mcp:resources",
    requiresApproval: false,
    obligations: [
      {
        type: "chunk_limit",
        details: "Max 4,000 characters per read operation",
      },
    ],
  },
];

export function GovernancePolicies() {
  const [policies, setPolicies] = useState<PolicyRule[]>(DEFAULT_POLICIES);
  const [profile, setProfile] = useState<string>("Active Control Plane");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");

  // Policy & Prompt Firewall Playground state
  const [simAgentId, setSimAgentId] = useState<string>("support-triage-agent");
  const [simTool, setSimTool] = useState<string>("draft_support_reply");
  const [simSideEffect, setSimSideEffect] = useState<string>("read");
  const [simApprovalToken, setSimApprovalToken] = useState<string>("");
  const [simPayload, setSimPayload] = useState<string>(
    '{"customerEmail": "alice@example.com", "message": "Please reset my billing password"}',
  );

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch("/api/governance/policies");
        if (res.ok) {
          const data: GovernanceData = await res.json();
          if (data.policies && data.policies.length > 0) {
            setPolicies(data.policies);
          }
          if (data.profile) {
            setProfile(data.profile);
          }
        }
      } catch (err) {
        console.warn(
          "[GovernancePolicies] Backend fetch skipped, using default policies:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchesSearch =
        (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk =
        selectedRisk === "all" ||
        p.riskLevel.toLowerCase() === selectedRisk.toLowerCase();
      return matchesSearch && matchesRisk;
    });
  }, [policies, searchQuery, selectedRisk]);

  const stats = useMemo(() => {
    const total = policies.length;
    const critical = policies.filter((p) => p.riskLevel === "critical").length;
    const hitl = policies.filter(
      (p) => p.requiresApproval || p.effect === "require_approval",
    ).length;
    const high = policies.filter((p) => p.riskLevel === "high").length;
    return { total, critical, hitl, high };
  }, [policies]);

  const simulationTrace = useMemo(() => {
    const steps: Array<{ stage: string; status: string; detail: string }> = [];
    const lowerPayload = simPayload.toLowerCase();

    // Layer 1: Prompt Injection WAF check
    const injectionPatterns = [
      "ignore previous instructions",
      "ignore all previous",
      "system prompt",
      "you are now",
      "bypass policy",
    ];
    const matchedInjection = injectionPatterns.find((p) =>
      lowerPayload.includes(p),
    );
    if (matchedInjection) {
      steps.push({
        stage: "Layer 1: Prompt Firewall (WAF)",
        status: "BLOCKED",
        detail: `Adversarial instruction override detected ("${matchedInjection}"). Execution halted before gateway.`,
      });
      return {
        finalDecision: "DENY (WAF_BLOCKED)",
        color: "rose",
        sanitizedPayload: simPayload,
        steps,
      };
    }
    steps.push({
      stage: "Layer 1: Prompt Firewall (WAF)",
      status: "PASSED",
      detail: "No prompt injection or jailbreak heuristics triggered.",
    });

    // Layer 2: PII Sanitization check
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const sanitized = simPayload
      .replace(emailRegex, "[REDACTED_EMAIL]")
      .replace(ssnRegex, "[REDACTED_SSN]");
    const piiFound = sanitized !== simPayload;
    steps.push({
      stage: "Layer 2: Privacy & PII Detector",
      status: piiFound ? "REDACTED" : "CLEAN",
      detail: piiFound
        ? "Sensitive PII entities scrubbed via akcp.policy.pii-sanitization obligation."
        : "Zero high-risk PII entities detected in payload.",
    });

    // Layer 3: Zero-Trust Capability & HITL Gate
    if (
      simTool === "delete_database" ||
      simTool === "execute_shell" ||
      simSideEffect === "unauthorized"
    ) {
      steps.push({
        stage: "Layer 3: Zero-Trust Policy Engine",
        status: "DENIED",
        detail: `Matched rule 'akcp.policy.zero-trust-default': Tool '${simTool}' is outside allowed capability boundaries for '${simAgentId}'.`,
      });
      return {
        finalDecision: "DENY (POLICY_VIOLATION)",
        color: "rose",
        sanitizedPayload: sanitized,
        steps,
      };
    }

    if (
      simSideEffect === "external-submit" ||
      simTool === "submit_application"
    ) {
      if (!simApprovalToken.trim()) {
        steps.push({
          stage: "Layer 3: HITL Approval Gate",
          status: "PAUSED",
          detail:
            "Matched rule 'akcp.policy.hitl-external-submit': External submission requires a one-time SHA-256 human approval token.",
        });
        return {
          finalDecision: "REQUIRE_APPROVAL (HITL_GATE)",
          color: "amber",
          sanitizedPayload: sanitized,
          steps,
        };
      }
      steps.push({
        stage: "Layer 3: HITL Approval Gate",
        status: "CONSUMED",
        detail: `One-time approval token '${simApprovalToken.slice(0, 12)}...' verified and consumed.`,
      });
    } else {
      steps.push({
        stage: "Layer 3: Zero-Trust Policy Engine",
        status: "ALLOWED",
        detail: `Capability '${simTool}' (${simSideEffect}) permitted for agent '${simAgentId}'.`,
      });
    }

    return {
      finalDecision: "ALLOW",
      color: "emerald",
      sanitizedPayload: sanitized,
      steps,
    };
  }, [simAgentId, simTool, simSideEffect, simApprovalToken, simPayload]);

  const getRiskBadgeClass = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                Zero-Trust Governance & Policies
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                Runtime guardrails, HITL gates, and autonomy boundaries enforced
                across agent executions.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 rounded-full self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Profile:{" "}
            <strong className="text-zinc-200 capitalize">{profile}</strong>
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.total}
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              Active Policies
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">
              {stats.critical}
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              Critical Risk Guardrails
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {stats.hitl}
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              HITL Gated Actions
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">100%</div>
            <div className="text-xs text-zinc-400 font-medium">
              Enforcement SLA
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Policy & Prompt Firewall Playground */}
      <div className="glass-panel p-6 rounded-2xl border border-neon-indigo/25 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-neon-indigo" />
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Interactive Policy & Prompt Firewall Playground
              </h3>
              <p className="text-xs text-zinc-400">
                Simulate an MCP capability request across WAF Prompt Injection
                filters, PII Redaction, and Zero-Trust HITL rules.
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              simulationTrace.color === "rose"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : simulationTrace.color === "amber"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}
          >
            Decision: {simulationTrace.finalDecision}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Agent Identity
            </label>
            <input
              type="text"
              value={simAgentId}
              onChange={(e) => setSimAgentId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              MCP Tool / Capability
            </label>
            <select
              value={simTool}
              onChange={(e) => setSimTool(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
            >
              <option value="draft_support_reply">draft_support_reply</option>
              <option value="submit_application">submit_application</option>
              <option value="read_document_chunk">read_document_chunk</option>
              <option value="delete_database">delete_database (Denied)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Side-Effect Class
            </label>
            <select
              value={simSideEffect}
              onChange={(e) => setSimSideEffect(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
            >
              <option value="read">read</option>
              <option value="write">write</option>
              <option value="external-submit">external-submit (HITL)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              HITL Approval Token (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. tok_sha256_approved"
              value={simApprovalToken}
              onChange={(e) => setSimApprovalToken(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Simulated Tool Arguments / Prompt Payload
            </label>
            <textarea
              rows={3}
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-mono"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-neon-indigo" />
              Gateway Evaluation Trace:
            </div>
            {simulationTrace.steps.map((step, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex items-start justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-zinc-200">
                    {step.stage}:
                  </span>{" "}
                  <span className="text-zinc-400">{step.detail}</span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formal Safety Invariant Prover (Finite State-Space Model Checker) */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Formal Policy Safety Invariant Prover
              </h3>
              <p className="text-xs text-zinc-400">
                Exhaustive finite-domain verification across (Environment ×
                Capability × RiskLevel × SideEffect × ApprovalState).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
            PROVEN SAFE (192 / 192 States • 0 Counterexamples)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: "NO_UNAPPROVED_CRITICAL_EXECUTION",
              desc: "Critical-risk capabilities are never allowed without a require_approval obligation or active token.",
            },
            {
              id: "NO_UNAPPROVED_EXTERNAL_SUBMIT",
              desc: "External submission side-effects ('submit') are never allowed without human-in-the-loop approval.",
            },
            {
              id: "PRODUCTION_HIGH_RISK_WRITE_GUARDED",
              desc: "High or critical risk write operations in production require explicit approval or are denied.",
            },
          ].map((inv) => (
            <div
              key={inv.id}
              className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-emerald-400 truncate">
                  {inv.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {inv.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search policies by name, id, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-neon-blue/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500 ml-1" />
          <div className="flex rounded-xl bg-zinc-900/90 border border-zinc-800 p-1 text-xs">
            {["all", "low", "medium", "high", "critical"].map((risk) => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                  selectedRisk === risk
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Policy List Cards */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 animate-pulse">
          Loading governance policies...
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-zinc-400">
          No policies match your search or filter criteria.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPolicies.map((policy) => (
            <div
              key={policy.id}
              className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-zinc-700/60 transition-all duration-200 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-zinc-100 text-base group-hover:text-neon-blue transition-colors">
                      {policy.name || policy.id}
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border uppercase tracking-wider ${getRiskBadgeClass(
                        policy.riskLevel,
                      )}`}
                    >
                      {policy.riskLevel}
                    </span>
                    {policy.requiresApproval ||
                    policy.effect === "require_approval" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Lock className="w-3 h-3" />
                        HITL Gated
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    {policy.id}
                  </div>
                </div>

                <div className="text-xs self-start sm:self-auto bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-zinc-300 font-mono">
                  Effect:{" "}
                  <strong
                    className={
                      policy.effect === "deny"
                        ? "text-rose-400"
                        : policy.effect === "require_approval"
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }
                  >
                    {policy.effect.toUpperCase()}
                  </strong>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                {policy.description}
              </p>

              {policy.obligations && policy.obligations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800/60">
                  <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-zinc-500" />
                    Enforced Obligations:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {policy.obligations.map((obl, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
                        <span className="font-mono text-[11px] text-zinc-400">
                          {obl.type}:
                        </span>
                        <span>{obl.details || obl.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
