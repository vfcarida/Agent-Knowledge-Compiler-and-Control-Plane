/**
 * @module components/governance/GovernancePolicies
 * @description Renders zero-trust governance policies, HITL gates, and autonomy boundaries.
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
    obligations: [{ type: "audit_log", details: "All rejections logged with cryptographic hash" }],
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
    obligations: [{ type: "pii_redact", details: "Scrub regex patterns before prompt delivery" }],
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
    obligations: [{ type: "chunk_limit", details: "Max 4,000 characters per read operation" }],
  },
];

export function GovernancePolicies() {
  const [policies, setPolicies] = useState<PolicyRule[]>(DEFAULT_POLICIES);
  const [profile, setProfile] = useState<string>("Active Control Plane");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");

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
        console.warn("[GovernancePolicies] Backend fetch skipped, using default policies:", err);
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
        selectedRisk === "all" || p.riskLevel.toLowerCase() === selectedRisk.toLowerCase();
      return matchesSearch && matchesRisk;
    });
  }, [policies, searchQuery, selectedRisk]);

  const stats = useMemo(() => {
    const total = policies.length;
    const critical = policies.filter((p) => p.riskLevel === "critical").length;
    const hitl = policies.filter((p) => p.requiresApproval || p.effect === "require_approval").length;
    const high = policies.filter((p) => p.riskLevel === "high").length;
    return { total, critical, hitl, high };
  }, [policies]);

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
                Runtime guardrails, HITL gates, and autonomy boundaries enforced across agent executions.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 rounded-full self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Profile: <strong className="text-zinc-200 capitalize">{profile}</strong></span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{stats.total}</div>
            <div className="text-xs text-zinc-400 font-medium">Active Policies</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">{stats.critical}</div>
            <div className="text-xs text-zinc-400 font-medium">Critical Risk Guardrails</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{stats.hitl}</div>
            <div className="text-xs text-zinc-400 font-medium">HITL Gated Actions</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">100%</div>
            <div className="text-xs text-zinc-400 font-medium">Enforcement SLA</div>
          </div>
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
                    {policy.requiresApproval || policy.effect === "require_approval" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Lock className="w-3 h-3" />
                        HITL Gated
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">{policy.id}</div>
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
                        <span className="font-mono text-[11px] text-zinc-400">{obl.type}:</span>
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
