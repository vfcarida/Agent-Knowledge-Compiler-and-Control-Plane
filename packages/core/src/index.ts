// Domain
export * from "./domain/types.js";
export * from "./domain/context-pack.js";

// Scorecard
export * from "./scorecard/types.js";
export * from "./scorecard/calculate.js";
export * from "./scorecard/recommendations.js";

// Plugins
export * from "./plugins/manifest-schema.js";
export * from "./plugins/loader.js";
export * from "./plugins/registry.js";

// Context Economics
export * from "./context/budget.js";
export * from "./context/token-estimator.js";
export * from "./context/relevance-score.js";
export * from "./context/context-pack-manifest.js";
export * from "./context/context-plan.js";

// Lifecycle
export * from "./lifecycle/types.js";
export * from "./lifecycle/freshness.js";
export * from "./lifecycle/deprecation.js";
export * from "./validation/lifecycle-rules.js";
export * from "./validation/capability-rules.js";
export * from "./domain/errors.js";
export * from "./domain/schemas.js";
export * from "./domain/capabilities.js";
export * from "./contracts/tool-result.js";
export type {
  IFileSystemAdapter,
  IFrontmatterParser,
  IOKFRepository,
  IIndexService,
  ILogService,
} from "./domain/interfaces.js";

// IR
/**
 * The compiled Agent Knowledge Intermediate Representation.
 */
export type { AgentKnowledgeIR } from "./ir/types.js";
export * from "./ir/types.js";
export * from "./ir/schema.js";
/**
 * Builds the Agent Knowledge IR from a bundle path.
 * This is the main entry point for the compiler pipeline.
 *
 * @param bundlePath - Path to the OKF bundle directory
 * @param options - Build configuration options
 * @returns The compiled AgentKnowledgeIR
 *
 * @example
 * ```typescript
 * const ir = await buildKnowledgeIR("./my-bundle", {
 *   targets: ["mcp-profile-server"],
 *   generateProvenance: true,
 * });
 * ```
 */
export { buildKnowledgeIR } from "./ir/build-ir.js";
export * from "./ir/build-ir.js";

// Targets
export * from "./targets/types.js";
export { IrJsonTarget } from "./targets/ir-json.js";
export { OkfBundleTarget } from "./targets/okf-bundle.js";
export { OpenWikiDocsTarget } from "./targets/openwiki-docs.js";
export { AgentsMdTarget } from "./targets/agents-md.js";
export { McpResourcesManifestTarget } from "./targets/mcp-resources-manifest.js";
export { PolicyBundleTarget } from "./targets/policy-bundle.js";
export { EvalDatasetTarget } from "./targets/eval-dataset.js";
export { GraphJsonTarget } from "./targets/graph-json.js";
export { DashboardMetadataTarget } from "./targets/dashboard-metadata.js";

// Infrastructure
export { FrontmatterParser } from "./infrastructure/frontmatter-parser.js";
export { FileSystemAdapter } from "./infrastructure/file-system-adapter.js";
export * from "./infrastructure/audit-log.js";

// Repositories
export { OKFFileRepository } from "./repositories/okf-file-repository.js";
export { OKFCachedRepository } from "./repositories/okf-cached-repository.js";

// Config and Planner
export * from "./config/akcp-config-schema.js";
export * from "./config/load-akcp-config.js";
export * from "./planner/build-plan.js";
export * from "./reconcile/reconcile.js";

// Connectors
export * from "./connectors/types.js";
export { OKFDirectoryConnector } from "./connectors/okf-directory.js";
export { MarkdownDirectoryConnector } from "./connectors/markdown-directory.js";
export { OpenWikiConnector } from "./connectors/openwiki.js";
export { OpenApiConnector } from "./connectors/openapi.js";
export { OpenWikiAdapter } from "./connectors/openwiki-adapter.js";
export { OkfAdapter } from "./connectors/okf-adapter.js";
export { normalizeRawItem } from "./normalizers/normalize.js";

// Services
/**
 * Core service for parsing, validating, and managing OKF documents.
 * Handles lifecycle, privacy, and dependency resolution.
 */
export { OKFDocumentService } from "./services/okf-document-service.js";
export { IndexService } from "./services/index-service.js";
export { LogService } from "./services/log-service.js";

// Factories
export { OKFDocumentFactory } from "./factories/okf-document-factory.js";

// Context Budgeting
/**
 * Assembles and compresses context packs based on relevance scores and budget constraints.
 */
export { ContextPacker } from "./services/context-packer.js";

// Policy & Governance
export * from "./domain/policy.js"; // Deprecated old policy
export * from "./policy/schema.js";
/**
 * Defines a Policy Card for agent governance.
 */
export type { PolicyCard } from "./policy/types.js";
export * from "./policy/types.js";
/**
 * Evaluates whether an agent capability request is permitted by a policy.
 */
export { evaluatePolicy } from "./policy/evaluate.js";
export * from "./policy/evaluate.js";
export * from "./policy/explain.js";
export * from "./policy/load.js";
export * from "./policies/engine.js";
export * from "./policies/adapter.js";
export * from "./policies/trace.js";

// Identity & Capabilities
export * from "./identity/types.js";
/**
 * Represents a request from an agent to execute an MCP capability.
 */
export type { CapabilityRequest } from "./capabilities/request.js";
export * from "./capabilities/request.js";
/**
 * The primary gateway for agent capability execution, enforcing policies, rate limits, and approvals.
 */
export { MCPGateway } from "./capabilities/gateway.js";
export * from "./capabilities/gateway.js";
export * from "./capabilities/approval-store.js";
/**
 * Token bucket rate limiter for controlling agent MCP capability usage.
 */
export {
  TokenBucketRateLimiter,
  type RateLimiterConfig,
} from "./capabilities/rate-limiter.js";
export {
  authenticate,
  hashApiKey,
  generateApiKey,
  type AgentCredential,
  type AuthConfig,
  type AuthResult,
} from "./capabilities/auth.js";

// Migrations
export { migrateBundle } from "./migrations/migrate-bundle.js";

// Observability
export {
  startTelemetry,
  stopTelemetry,
  mcpToolCallsCounter,
  mcpToolFailuresCounter,
  bundleMigrationsCounter,
  okfParseFailuresCounter,
  automationAttemptsCounter,
  automationApprovalRequiredCounter,
  automationSubmissionBlockedCounter,
  automationSubmissionSuccessCounter,
  withToolTracing,
} from "./observability/otel.js";

// Integrations
export * from "./integrations/importer.js";

// Agents
export * from "./agents/sync.js";

// Provenance
export * from "./provenance/types.js";
export * from "./provenance/hash.js";
export * from "./provenance/build-manifest.js";
export * from "./provenance/verify.js";

// Scanner
export * from "./scanner/scan.js";

// Compiler
export * from "./compiler/incremental-build-state.js";
export * from "./compiler/pipeline.js";
export { runCompilerPipeline } from "./compiler/run-pipeline.js";

// Result type
export * from "./domain/result.js";

// Compiler (Result-based API)
export {
  compile,
  type CompileResult,
  type CompilerWarning,
  type CompileStats,
} from "./compiler/compile.js";
export type { CompilerError } from "./compiler/errors.js";

// Privacy
export * from "./privacy/index.js";
export * from "./privacy/pii-detector.js";
/**
 * Local regular expression-based PII detector.
 */
export { RegexPiiDetector } from "./privacy/regex-pii-detector.js";
/**
 * Factory for creating PII detectors based on the provided configuration.
 */
export { createPiiDetector } from "./privacy/create-detector.js";
export * from "./privacy/waf.js";
