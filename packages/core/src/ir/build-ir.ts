import { basename } from "path";
import { randomUUID } from "crypto";
import path from "path";
import fsSync from "fs";
import { FileSystemAdapter } from "../infrastructure/file-system-adapter.js";
import type { AgentKnowledgeIR, IRConcept, IRLink } from "./types.js";
import { OKFDirectoryConnector } from "../connectors/okf-directory.js";
import { MarkdownDirectoryConnector } from "../connectors/markdown-directory.js";
import { OpenWikiConnector } from "../connectors/openwiki.js";
import { OpenApiConnector } from "../connectors/openapi.js";
import { normalizeRawItem } from "../normalizers/normalize.js";
import { Freshness } from "../lifecycle/freshness.js";
import { LifecycleValidator } from "../validation/lifecycle-rules.js";
import type { ConnectorConfig, RawKnowledgeItem } from "../connectors/types.js";
import { PiiRedactor, PiiReport, HttpSecurityGateway } from "../privacy/index.js";

export interface BuildOptions {
  bundleId?: string;
  policies?: Record<string, any>;
  targets?: string[];
  capabilities?: any[];
  sources?: ConnectorConfig[];
  generateProvenance?: boolean;
  privacy?: any;
}

export async function buildKnowledgeIR(
  bundlePath: string,
  options: BuildOptions = {},
): Promise<AgentKnowledgeIR> {
  const fsAdapter = new FileSystemAdapter();

  // Backwards compatibility: if sources is not provided, default to OKF directory at bundlePath
  const sourcesToIngest: ConnectorConfig[] = options.sources || [
    { type: "okf-directory", path: bundlePath },
  ];

  const allRawItems: RawKnowledgeItem[] = [];

  for (const sourceConfig of sourcesToIngest) {
    let items: RawKnowledgeItem[] = [];
    const resolvedConfig = { ...sourceConfig };
    if (resolvedConfig.path) {
      resolvedConfig.path = path.resolve(bundlePath, resolvedConfig.path);
    }

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
      default:
        console.warn(
          `[WARN] Unknown source type '${resolvedConfig.type}', skipping.`,
        );
    }
    allRawItems.push(...items);
  }

  // Attempt to load previous IR for incremental build
  const { IncrementalCompiler } =
    await import("../compiler/incremental-build-state.js");
  const incrementalCompiler = new IncrementalCompiler(bundlePath);

  let previousIr: AgentKnowledgeIR | null = null;
  try {
    const prevIrPath = path.resolve(process.cwd(), "dist/knowledge-ir.json");
    if (fsSync.existsSync(prevIrPath)) {
      previousIr = JSON.parse(fsSync.readFileSync(prevIrPath, "utf-8"));
    }
  } catch (e) {
    // Ignore cache load failures
  }

  let skippedCount = 0;
  const sourceHashes: Record<string, string> = {};

  let piiRedactor: any = new PiiRedactor();
  if (options.privacy?.gatewayUrl) {
    piiRedactor = new HttpSecurityGateway(options.privacy.gatewayUrl, options.privacy.redactionTokenFormat);
  }
  const piiReport = new PiiReport();

  const concepts: IRConcept[] = [];
  
  for (const item of allRawItems) {
    sourceHashes[item.sourceUri] = item.contentHash;

    if (
      !incrementalCompiler.shouldCompile(item.sourceUri, item.contentHash) &&
      previousIr
    ) {
      const prevConcept = previousIr.concepts.find(
        (c) =>
          c.source.filePath === item.sourceUri ||
          c.source.filePath === item.metadata?.relativePath ||
          c.source.filePath ===
            item.metadata?.relativePath?.replace(/\\/g, "/")
      );
      if (prevConcept) {
        skippedCount++;
        concepts.push(prevConcept);
        continue;
      }
    }

    let concept = normalizeRawItem(item);
    
    // Auto-summarization for Context Compression
    if (!concept.frontmatter.summary && concept.body && concept.body.length > 500) {
      // Very naive extractive summary (first paragraph or first 500 chars)
      const firstParagraph = concept.body.split("\n\n").find(p => p.trim().length > 20 && !p.startsWith("#"));
      if (firstParagraph) {
        concept.frontmatter.summary = firstParagraph.substring(0, 300).trim() + (firstParagraph.length > 300 ? "..." : "");
      } else {
        concept.frontmatter.summary = concept.body.substring(0, 300).replace(/\n/g, " ").trim() + "...";
      }
    }
    
    // PII Redaction
    if (options.privacy) {
      const mode = options.privacy.defaultPiiMode || "redact";
      const redactionResult = await piiRedactor.redact(concept.body, {
        mode,
        allowedClasses: options.privacy.allowedPiiClasses,
        blockedClasses: options.privacy.blockedPiiClasses,
        tokenFormat: options.privacy.redactionTokenFormat,
        failOnUnredactedHighRiskPii: options.privacy.failOnUnredactedHighRiskPii
      });

      if (redactionResult.blocked) {
        throw new Error(`[PII_ERROR] Build failed: Unredacted high-risk PII detected in ${item.sourceUri}`);
      }

      concept.body = redactionResult.redactedText;
      
      // Also redact frontmatter string values recursively
      const redactObject = async (obj: any) => {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === "string") {
            const fmResult = await piiRedactor.redact(v, {
              mode,
              allowedClasses: options.privacy.allowedPiiClasses,
              blockedClasses: options.privacy.blockedPiiClasses,
              tokenFormat: options.privacy.redactionTokenFormat,
              failOnUnredactedHighRiskPii: options.privacy.failOnUnredactedHighRiskPii
            });
            if (fmResult.blocked) {
              throw new Error(`[PII_ERROR] Build failed: Unredacted high-risk PII detected in frontmatter of ${item.sourceUri}`);
            }
            obj[k] = fmResult.redactedText;
            for (const finding of fmResult.findings) {
              piiReport.addFinding(item.sourceUri, finding);
            }
          } else if (v && typeof v === "object") {
            await redactObject(v);
          }
        }
      };
      
      await redactObject(concept.frontmatter);
      
      for (const finding of redactionResult.findings) {
        piiReport.addFinding(item.sourceUri, finding);
      }
    }

    incrementalCompiler.updateState(
      item.sourceUri,
      item.contentHash,
      concept.conceptId,
    );

    // Evaluate Lifecycle Freshness
    concept.status = Freshness.getEffectiveStatus(concept.frontmatter);
    concept.isStale = concept.status === "stale";

    if (options.generateProvenance) {
      concept.provenance = {
        conceptId: concept.conceptId,
        sourceFile: item.sourceUri,
        sourceHash: item.contentHash,
        timestamp: new Date().toISOString(),
      };
    }
    
    concepts.push(concept);
  }

  // Save PII report if requested
  if (options.privacy) {
    const reportPath = path.resolve(process.cwd(), "dist/privacy/pii-report.json");
    piiReport.save(reportPath);
  }

  incrementalCompiler.saveState();

  if (skippedCount > 0) {
    console.log(
      `[INFO] Incremental build: reused ${skippedCount} unchanged concepts from cache.`,
    );
  }

  // Extract explicit links if specified in frontmatter.links and markdown body
  const links: IRLink[] = [];
  const { extractMarkdownLinks } = await import("../graph/extract-links.js");

  concepts.forEach((concept) => {
    // 1. Frontmatter links
    if (concept.frontmatter.links && Array.isArray(concept.frontmatter.links)) {
      concept.frontmatter.links.forEach((link: any) => {
        if (link.target) {
          links.push({
            sourceConceptId: concept.conceptId,
            targetConceptId: link.target,
            relationType: link.type || "relates_to",
          });
        }
      });
    }

    // 2. Markdown Body links
    if (concept.body) {
      const extracted = extractMarkdownLinks(concept.conceptId, concept.body);
      extracted.forEach((e) => {
        // Only push if we didn't already have this exact link (dedup)
        const exists = links.find(
          (l) =>
            l.sourceConceptId === concept.conceptId &&
            l.targetConceptId === e.targetConceptId &&
            l.relationType === e.relationType,
        );
        if (!exists) {
          links.push({
            sourceConceptId: concept.conceptId,
            targetConceptId: e.targetConceptId,
            relationType: e.relationType,
          });
        }
      });
    }
  });

  let validatedCapabilities: any[] = [];
  if (options.capabilities && options.capabilities.length > 0) {
    try {
      const { z } = await import("zod");
      const { CapabilitySchema } = await import("./schema.js");
      validatedCapabilities = z.array(CapabilitySchema).parse(options.capabilities);
    } catch (err: any) {
      console.error(`[ERROR] Invalid capabilities schema detected in bundle:`);
      if (err.errors) {
        err.errors.forEach((e: any) => console.error(`  - ${e.path.join(".")}: ${e.message}`));
      } else {
        console.error(err.message);
      }
      throw new Error(`[VALIDATION_ERROR] Failed to compile due to invalid capabilities.`);
    }
  }

  const ir: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: options.bundleId || basename(bundlePath),
    buildId: `bld_${randomUUID().split("-")[0]}`,
    timestamp: new Date().toISOString(),
    concepts,
    links,
    policies: options.policies,
    capabilities: validatedCapabilities,
    targets: options.targets || ["mcp-profile-server", "mcp-automation-server"],
    sourceHashes,
  };

  LifecycleValidator.validate(ir);
  const { CapabilityValidator } = await import("../validation/capability-rules.js");
  CapabilityValidator.validate(ir.capabilities as any);
  return ir;
}
