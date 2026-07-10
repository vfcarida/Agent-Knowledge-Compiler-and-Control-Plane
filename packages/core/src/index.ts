// Domain
export * from './domain/types.js';
export * from './domain/context-pack.js';

// Scorecard
export * from './scorecard/types.js';
export * from './scorecard/calculate.js';
export * from './scorecard/recommendations.js';

// Plugins
export * from './plugins/manifest-schema.js';
export * from './plugins/loader.js';
export * from './plugins/registry.js';

// Context Economics
export * from './context/budget.js';
export * from './context/token-estimator.js';
export * from './context/relevance-score.js';
export * from './context/context-pack-manifest.js';
export * from './context/context-plan.js';

// Lifecycle
export * from './lifecycle/types.js';
export * from './lifecycle/freshness.js';
export * from './lifecycle/deprecation.js';
export * from './domain/errors.js';
export * from './domain/schemas.js';
export * from './domain/capabilities.js';
export * from './contracts/tool-result.js';
export type { IFileSystemAdapter, IFrontmatterParser, IOKFRepository, IIndexService, ILogService } from './domain/interfaces.js';

// IR
export * from './ir/types.js';
export * from './ir/schema.js';
export * from './ir/build-ir.js';

// Targets
export * from './targets/types.js';
export * from './targets/manifest-builder.js';
export { IrJsonTarget } from './targets/ir-json.js';
export { OkfBundleTarget } from './targets/okf-bundle.js';
export { OpenWikiDocsTarget } from './targets/openwiki-docs.js';
export { AgentsMdTarget } from './targets/agents-md.js';
export { McpResourcesManifestTarget } from './targets/mcp-resources-manifest.js';
export { PolicyBundleTarget } from './targets/policy-bundle.js';
export { EvalDatasetTarget } from './targets/eval-dataset.js';
export { GraphJsonTarget } from './targets/graph-json.js';

// Infrastructure
export { FrontmatterParser } from './infrastructure/frontmatter-parser.js';
export { FileSystemAdapter } from './infrastructure/file-system-adapter.js';

// Repositories
export { OKFFileRepository } from './repositories/okf-file-repository.js';
export { OKFCachedRepository } from './repositories/okf-cached-repository.js';

// Config and Planner
export * from './config/akcp-config-schema.js';
export * from './config/load-akcp-config.js';
export * from './planner/build-plan.js';
export * from './reconcile/reconcile.js';

// Connectors
export * from './connectors/types.js';
export { OKFDirectoryConnector } from './connectors/okf-directory.js';
export { MarkdownDirectoryConnector } from './connectors/markdown-directory.js';
export { OpenWikiConnector } from './connectors/openwiki.js';
export { OpenApiConnector } from './connectors/openapi.js';
export { normalizeRawItem } from './normalizers/normalize.js';

// Services
export { OKFDocumentService } from './services/okf-document-service.js';
export { IndexService } from './services/index-service.js';
export { LogService } from './services/log-service.js';

// Factories
export { OKFDocumentFactory } from './factories/okf-document-factory.js';

// Context Budgeting
export * from './domain/context-pack.js';
export { ContextPacker } from './services/context-packer.js';

// Policy & Governance
export * from './domain/policy.js'; // Deprecated old policy
export * from './policy/schema.js';
export * from './policy/types.js';
export * from './policy/evaluate.js';
export * from './policy/explain.js';
export * from './policy/load.js';

// Identity & Capabilities
export * from './identity/types.js';
export * from './capabilities/request.js';
export * from './capabilities/gateway.js';

// Migrations
export { migrateBundle } from './migrations/migrate-bundle.js';

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
  withToolTracing
} from './observability/otel.js';

// Integrations
export * from './integrations/openwiki-importer.js';

// Agents
export * from './agents/sync.js';

// Provenance
export * from './provenance/types.js';
export * from './provenance/hash.js';
export * from './provenance/build-manifest.js';
export * from './provenance/verify.js';
