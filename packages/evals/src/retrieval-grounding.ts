import { ContextPacker } from "@akcp/core";
import type { OKFDocument } from "@akcp/core";

export interface RetrievalTestCase {
  id: string;
  query: string;
  profile: string;
  expectedConceptIds: string[];
  k?: number;
}

export interface RetrievalMetricResult {
  testCaseId: string;
  query: string;
  k: number;
  retrievedIds: string[];
  expectedIds: string[];
  precisionAtK: number;
  recallAtK: number;
  hit: boolean;
}

export interface RetrievalGroundingEvalResult {
  scenario: "retrieval-grounding";
  totalQueries: number;
  meanPrecisionAtK: number;
  meanRecallAtK: number;
  hitRate: number;
  passed: boolean;
  details: RetrievalMetricResult[];
}

export const DEFAULT_RETRIEVAL_CORPUS: OKFDocument[] = [
  {
    conceptId: "doc-db-pool-exhaustion",
    filePath: "/runbooks/database-pool-exhaustion.md",
    frontmatter: {
      type: "Runbook",
      title: "PostgreSQL Database Connection Pool Exhaustion",
      priority: "critical",
      tags: ["database", "postgres", "pool", "timeout", "exhaustion", "rds"],
    },
    body: "Runbook for diagnosing and remediating database connection pool exhaustion in PostgreSQL clusters. When connection counts exceed max_connections, client queries fail with FATAL: remaining connection slots are reserved. Increase pool size or terminate idle clients.",
  },
  {
    conceptId: "doc-pod-crashloop",
    filePath: "/runbooks/pod-crashloop.md",
    frontmatter: {
      type: "Runbook",
      title: "Kubernetes Pod CrashLoopBackOff Troubleshooting",
      priority: "high",
      tags: ["kubernetes", "pod", "crashloop", "k8s", "container"],
    },
    body: "Step-by-step diagnostic guide for containers in CrashLoopBackOff state. Inspect kubectl logs --previous, check memory OOMKilled events, and verify liveness probe configurations.",
  },
  {
    conceptId: "doc-dns-resolution-latency",
    filePath: "/runbooks/dns-latency.md",
    frontmatter: {
      type: "Runbook",
      title: "CoreDNS Resolution Latency and Failure Diagnosis",
      priority: "high",
      tags: ["dns", "coredns", "latency", "network", "resolution"],
    },
    body: "Troubleshooting guide for DNS resolution delays inside container networks. Check CoreDNS cache hit ratios, upstream forwarder latency, and ndots settings in resolv.conf.",
  },
  {
    conceptId: "doc-refund-policy",
    filePath: "/policies/refund-policy.md",
    frontmatter: {
      type: "Policy",
      title: "Customer Refund and Chargeback Handling Policy",
      priority: "critical",
      tags: ["refund", "billing", "chargeback", "customer", "payment"],
    },
    body: "Operational policy governing customer refunds. Automatic refunds are permitted within 30 days of purchase for transactions under $50. Transactions exceeding $50 or involving active dispute chargebacks require Tier 2 human supervisor authorization.",
  },
  {
    conceptId: "doc-ticket-escalation",
    filePath: "/workflows/ticket-escalation.md",
    frontmatter: {
      type: "Workflow",
      title: "Tier 3 Incident Escalation and On-Call Workflow",
      priority: "high",
      tags: ["escalation", "ticket", "support", "incident", "tier3"],
    },
    body: "Standard operating procedure for escalating critical tickets from customer support to engineering on-call responders. P1 incidents must be acknowledged within 15 minutes.",
  },
  {
    conceptId: "doc-account-deletion",
    filePath: "/policies/account-deletion.md",
    frontmatter: {
      type: "Policy",
      title: "GDPR Right to Be Forgotten and Account Deletion Procedures",
      priority: "critical",
      tags: ["gdpr", "deletion", "account", "privacy", "compliance"],
    },
    body: "Compliance guideline for permanent account deletion requests under GDPR Article 17. All customer PII must be purged from primary databases within 30 days, while financial ledger records must be anonymized.",
  },
  {
    conceptId: "doc-typescript-standards",
    filePath: "/standards/typescript-standards.md",
    frontmatter: {
      type: "Standard",
      title: "TypeScript ESM Coding Standards and Strict Type Guidelines",
      priority: "high",
      tags: ["typescript", "esm", "types", "standards", "code"],
    },
    body: "Engineering coding standards: All packages must target pure ESM with Node.js subpath exports. Strict mode must be enabled in tsconfig.json. Explicit return types are required on public API boundaries.",
  },
  {
    conceptId: "doc-mcp-zero-trust-gateway",
    filePath: "/architecture/mcp-gateway.md",
    frontmatter: {
      type: "Architecture",
      title: "Zero-Trust MCP Gateway and Tool Dispatch Architecture",
      priority: "critical",
      tags: ["mcp", "gateway", "zero-trust", "tools", "dispatch"],
    },
    body: "Architectural specification of the zero-trust MCP gateway. All tool invocations undergo policy evaluation, rate limiting, and parameter validation before reaching tool executors.",
  },
  {
    conceptId: "doc-hitl-approval-tokens",
    filePath: "/policies/hitl-approval-tokens.md",
    frontmatter: {
      type: "Policy",
      title: "Human-in-the-Loop HITL Approval Token Lifecycle",
      priority: "high",
      tags: ["hitl", "approval", "token", "security", "governance"],
    },
    body: "Policy specification governing high-risk tool execution. When an action matches a require_approval rule, a cryptographically signed approval token with a 15-minute TTL must be obtained before execution.",
  },
  {
    conceptId: "doc-rate-limiter-tuning",
    filePath: "/guides/rate-limiter-tuning.md",
    frontmatter: {
      type: "Guide",
      title: "Token Bucket Rate Limiter Tuning and Redis Integration",
      priority: "high",
      tags: ["rate-limiter", "token-bucket", "redis", "burst", "throttling"],
    },
    body: "Configuration guide for token bucket rate limiters in distributed agent deployments. Explains capacity, refillRate, per-key agent isolation, and fail-open vs fail-closed Redis behaviors.",
  },
  {
    conceptId: "doc-pii-redaction-rules",
    filePath: "/policies/pii-redaction.md",
    frontmatter: {
      type: "Policy",
      title: "PII Detection and Automated Redaction Rules for Knowledge",
      priority: "critical",
      tags: ["pii", "redaction", "privacy", "anonymization", "gdpr"],
    },
    body: "Automated privacy controls: Detects and masks social security numbers, credit card numbers, email addresses, and phone numbers in retrieved context packs before LLM ingestion.",
  },
  {
    conceptId: "doc-ci-golden-snapshots",
    filePath: "/standards/ci-golden-snapshots.md",
    frontmatter: {
      type: "Standard",
      title: "Deterministic Compilation and CI Golden Snapshot Tests",
      priority: "medium",
      tags: ["ci", "golden", "snapshots", "testing", "compiler"],
    },
    body: "Testing standard ensuring compiled knowledge IR manifests and OpenWiki artifacts remain bit-for-bit reproducible across operating systems and CI runners.",
  },
];

export const DEFAULT_RETRIEVAL_TEST_CASES: RetrievalTestCase[] = [
  {
    id: "retrieval-001",
    query: "PostgreSQL database connection pool exhaustion timeout runbook",
    profile: "it-operations",
    expectedConceptIds: ["doc-db-pool-exhaustion"],
    k: 1,
  },
  {
    id: "retrieval-002",
    query: "Kubernetes pod CrashLoopBackOff container diagnosis runbook",
    profile: "it-operations",
    expectedConceptIds: ["doc-pod-crashloop"],
    k: 1,
  },
  {
    id: "retrieval-003",
    query: "Customer refund chargeback billing dispute policy",
    profile: "customer-support",
    expectedConceptIds: ["doc-refund-policy"],
    k: 1,
  },
  {
    id: "retrieval-004",
    query: "Human-in-the-loop HITL approval token security policy",
    profile: "security",
    expectedConceptIds: ["doc-hitl-approval-tokens"],
    k: 1,
  },
  {
    id: "retrieval-005",
    query:
      "Token bucket rate limiter burst throttling Redis configuration guide",
    profile: "architecture",
    expectedConceptIds: ["doc-rate-limiter-tuning"],
    k: 1,
  },
  {
    id: "retrieval-006",
    query: "PII detection and automated redaction privacy policy",
    profile: "governance",
    expectedConceptIds: ["doc-pii-redaction-rules"],
    k: 1,
  },
  {
    id: "retrieval-007",
    query: "TypeScript ESM coding standards and strict type guideline standard",
    profile: "engineering",
    expectedConceptIds: ["doc-typescript-standards"],
    k: 1,
  },
  {
    id: "retrieval-008",
    query: "Zero-trust MCP gateway tool dispatch architecture",
    profile: "architecture",
    expectedConceptIds: ["doc-mcp-zero-trust-gateway"],
    k: 1,
  },
  {
    id: "retrieval-009",
    query: "GDPR account deletion right to be forgotten compliance policy",
    profile: "customer-support",
    expectedConceptIds: ["doc-account-deletion"],
    k: 1,
  },
  {
    id: "retrieval-010",
    query: "CoreDNS resolution latency and failure diagnosis network runbook",
    profile: "it-operations",
    expectedConceptIds: ["doc-dns-resolution-latency"],
    k: 1,
  },
  {
    id: "retrieval-011",
    query:
      "Database connection pool exhaustion and CoreDNS resolution latency incident runbooks",
    profile: "it-operations",
    expectedConceptIds: [
      "doc-db-pool-exhaustion",
      "doc-dns-resolution-latency",
    ],
    k: 2,
  },
  {
    id: "retrieval-012",
    query: "Customer refund policy and GDPR account deletion compliance",
    profile: "customer-support",
    expectedConceptIds: ["doc-refund-policy", "doc-account-deletion"],
    k: 2,
  },
  {
    id: "retrieval-013",
    query: "Zero-trust MCP gateway architecture and HITL approval token policy",
    profile: "security",
    expectedConceptIds: [
      "doc-mcp-zero-trust-gateway",
      "doc-hitl-approval-tokens",
    ],
    k: 2,
  },
];

export async function runRetrievalGroundingEval(options?: {
  documents?: OKFDocument[];
  testCases?: RetrievalTestCase[];
  packer?: ContextPacker;
}): Promise<RetrievalGroundingEvalResult> {
  const documents = options?.documents ?? DEFAULT_RETRIEVAL_CORPUS;
  const testCases = options?.testCases ?? DEFAULT_RETRIEVAL_TEST_CASES;
  const packer = options?.packer ?? new ContextPacker();

  const details: RetrievalMetricResult[] = [];

  for (const testCase of testCases) {
    const k = testCase.k ?? testCase.expectedConceptIds.length;

    // Pack context for this task query with ample token budget
    const packResult = packer.pack(documents, {
      task: testCase.query,
      profile: testCase.profile,
      mode: "balanced",
      maxTokens: 50000,
      includeProvenance: true,
    });

    const retrievedIds = packResult.documents.map((d) => d.id).slice(0, k);
    const relevantRetrieved = retrievedIds.filter((id) =>
      testCase.expectedConceptIds.includes(id),
    );

    const targetCount = Math.min(k, testCase.expectedConceptIds.length);
    const precisionAtK =
      targetCount > 0 ? relevantRetrieved.length / targetCount : 0;
    const recallAtK =
      testCase.expectedConceptIds.length > 0
        ? relevantRetrieved.length / testCase.expectedConceptIds.length
        : 0;
    const hit = relevantRetrieved.length > 0;

    details.push({
      testCaseId: testCase.id,
      query: testCase.query,
      k,
      retrievedIds,
      expectedIds: testCase.expectedConceptIds,
      precisionAtK,
      recallAtK,
      hit,
    });
  }

  const totalQueries = details.length;
  const sumPrecision = details.reduce((sum, d) => sum + d.precisionAtK, 0);
  const sumRecall = details.reduce((sum, d) => sum + d.recallAtK, 0);
  const hitsCount = details.filter((d) => d.hit).length;

  const meanPrecisionAtK = totalQueries > 0 ? sumPrecision / totalQueries : 0;
  const meanRecallAtK = totalQueries > 0 ? sumRecall / totalQueries : 0;
  const hitRate = totalQueries > 0 ? hitsCount / totalQueries : 0;

  return {
    scenario: "retrieval-grounding",
    totalQueries,
    meanPrecisionAtK,
    meanRecallAtK,
    hitRate,
    passed: meanPrecisionAtK >= 0.8,
    details,
  };
}
