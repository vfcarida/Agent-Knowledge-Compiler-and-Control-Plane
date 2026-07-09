// Domain
export * from './domain/types.js';
export * from './domain/errors.js';
export * from './domain/schemas.js';
export * from './domain/capabilities.js';
export * from './contracts/tool-result.js';
export type { IFileSystemAdapter, IFrontmatterParser, IOKFRepository, IIndexService, ILogService } from './domain/interfaces.js';

// Infrastructure
export { FrontmatterParser } from './infrastructure/frontmatter-parser.js';
export { FileSystemAdapter } from './infrastructure/file-system-adapter.js';

// Repositories
export { OKFFileRepository } from './repositories/okf-file-repository.js';

// Services
export { OKFDocumentService } from './services/okf-document-service.js';
export { IndexService } from './services/index-service.js';
export { LogService } from './services/log-service.js';

// Factories
export { OKFDocumentFactory } from './factories/okf-document-factory.js';

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
export { importOpenWiki } from './integrations/openwiki-importer.js';
