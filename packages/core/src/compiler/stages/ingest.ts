import type { PipelineContext, PipelineStage } from "../pipeline.js";
import type {
  ConnectorConfig,
  RawKnowledgeItem,
} from "../../connectors/types.js";
import { FileSystemAdapter } from "../../infrastructure/file-system-adapter.js";
import { OKFDirectoryConnector } from "../../connectors/okf-directory.js";
import { MarkdownDirectoryConnector } from "../../connectors/markdown-directory.js";
import { OpenWikiConnector } from "../../connectors/openwiki.js";
import { OpenApiConnector } from "../../connectors/openapi.js";
import { MockZendeskConnector } from "../../connectors/mock-zendesk.js";
import path from "path";

export class IngestStage implements PipelineStage {
  name = "ingest";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const fsAdapter = new FileSystemAdapter();
    const sources: ConnectorConfig[] = context.options.sources || [
      { type: "okf-directory", path: context.bundlePath },
    ];

    const allRawItems: RawKnowledgeItem[] = [];

    for (const sourceConfig of sources) {
      const resolvedConfig = { ...sourceConfig };
      if (resolvedConfig.path) {
        resolvedConfig.path = path.resolve(
          context.bundlePath,
          resolvedConfig.path,
        );
      }

      let items: RawKnowledgeItem[] = [];
      switch (resolvedConfig.type) {
        case "okf-directory":
          items = await new OKFDirectoryConnector(fsAdapter).ingest(
            resolvedConfig,
          );
          break;
        case "markdown-directory":
          items = await new MarkdownDirectoryConnector(fsAdapter).ingest(
            resolvedConfig,
          );
          break;
        case "openwiki":
          items = await new OpenWikiConnector(fsAdapter).ingest(resolvedConfig);
          break;
        case "openapi":
          items = await new OpenApiConnector(fsAdapter).ingest(resolvedConfig);
          break;
        case "mock-zendesk":
          items = await new MockZendeskConnector().ingest(resolvedConfig);
          break;
        default:
          // Unknown source type, skip silently
          break;
      }
      allRawItems.push(...items);
    }

    return { ...context, rawItems: allRawItems };
  }
}
