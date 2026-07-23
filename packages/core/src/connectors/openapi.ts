import { createHash } from "node:crypto";
import path from "node:path";
import type { IFileSystemAdapter } from "../domain/interfaces.js";
import type {
  ConnectorConfig,
  KnowledgeSourceConnector,
  RawKnowledgeItem,
} from "./types.js";
import yaml from "yaml";

/**
 * Experimental connector for ingesting OpenAPI specs as knowledge artifacts.
 * This implementation uses simple parsing without adding heavy external dependencies like 'swagger-parser'.
 */
export class OpenApiConnector implements KnowledgeSourceConnector {
  public readonly connectorType = "openapi";

  // eslint-disable-next-line no-unused-vars
  constructor(private readonly fsAdapter: IFileSystemAdapter) {}

  async ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]> {
    if (!config.path) {
      throw new Error(
        `OpenApiConnector requires a 'path' config pointing to the openapi json/yaml file.`,
      );
    }

    const items: RawKnowledgeItem[] = [];
    const sourceFile = path.resolve(process.cwd(), config.path);

    if (!(await this.fsAdapter.exists(sourceFile))) {
      throw new Error(`OpenAPI file not found: ${sourceFile}`);
    }

    const content = await this.fsAdapter.readFile(sourceFile);

    // In a real robust implementation we might use a proper OpenAPI parser
    // but here we do naive extraction of paths to demonstrate the capability
    // without inflating the dependency tree.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let spec: any;
    try {
      if (sourceFile.endsWith(".yaml") || sourceFile.endsWith(".yml")) {
        spec = yaml.parse(content);
      } else {
        spec = JSON.parse(content);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error(`Failed to parse OpenAPI file: ${e.message}`);
    }

    if (!spec.paths) {
      return items;
    }

    // Convert each path/method into a distinct raw knowledge item
    for (const [apiPath, pathItem] of Object.entries(spec.paths)) {
      if (typeof pathItem !== "object" || !pathItem) continue;

      for (const [method, operation] of Object.entries(
        pathItem as Record<string, unknown>,
      )) {
        if (typeof operation !== "object" || !operation) continue;

        // Skip non-http methods
        if (
          ![
            "get",
            "post",
            "put",
            "delete",
            "patch",
            "options",
            "head",
          ].includes(method.toLowerCase())
        ) {
          continue;
        }

        const op = operation as {
          operationId?: string;
          summary?: string;
          description?: string;
        };
        const conceptId =
          op.operationId ||
          `${method}-${apiPath}`
            .replace(/[^a-zA-Z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        const rawContent = `
# ${op.summary || conceptId}

${op.description || "No description provided."}
Path: ${apiPath}

${op.description || ""}
        `.trim();

        const hash = createHash("sha256").update(rawContent).digest("hex");

        items.push({
          sourceUri: `file://${sourceFile}#/paths${apiPath.replace(/\//g, "~1")}/${method}`,
          contentHash: hash,
          metadata: {
            conceptId,
            originalFormat: "openapi/endpoint",
            method: method.toUpperCase(),
            apiPath,
          },
          rawContent,
        });
      }
    }

    return items;
  }
}
