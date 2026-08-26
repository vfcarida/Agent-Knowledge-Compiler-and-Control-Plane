import path from "node:path";
import fs from "node:fs";
import * as yaml from "js-yaml";
import type { SourceAdapter, SourceImportReport } from "../connectors/types.js";
import { OpenWikiAdapter } from "../connectors/openwiki-adapter.js";
import { OkfAdapter } from "../connectors/okf-adapter.js";

export async function importSource(
  sourceType: "openwiki" | "okf",
  inputDir: string,
  outputDir: string,
  dryRun: boolean = false,
): Promise<SourceImportReport> {
  const adapter: SourceAdapter =
    sourceType === "openwiki" ? new OpenWikiAdapter() : new OkfAdapter();

  const report: SourceImportReport = {
    ok: true,
    sourceType,
    inputPath: inputDir,
    outputPath: outputDir,
    documentsFound: 0,
    documentsImported: 0,
    documentsSkipped: 0,
    diagnostics: [],
    provenance: [],
  };

  const detection = await adapter.detect(inputDir);
  if (!detection.isSupported) {
    report.ok = false;
    report.diagnostics.push({
      level: "error",
      message: `Input directory is not a valid ${sourceType} source. Reason: ${detection.reason}`,
    });
    return report;
  }

  const docs = await adapter.scan(inputDir);
  report.documentsFound = docs.length;

  for (const doc of docs) {
    try {
      const normalized = await adapter.normalize(doc);

      const relPath = path.relative(
        inputDir,
        doc.sourceUri.replace("file://", "").replace(/\\/g, "/"),
      );
      const targetPath = path.join(outputDir, relPath);

      report.provenance.push(normalized.provenance);

      if (!dryRun) {
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        const finalYaml = yaml.dump(normalized.frontmatter);
        const finalContent = `---\n${finalYaml}---\n\n${normalized.markdown}`;
        await fs.promises.writeFile(targetPath, finalContent, "utf-8");
      }

      report.documentsImported++;
      report.diagnostics.push({
        level: "info",
        message: `Imported ${relPath} as ${normalized.type}`,
      });
    } catch (e: any) {
      report.documentsSkipped++;
      report.diagnostics.push({
        level: "error",
        message: `Failed to import ${doc.sourceUri}: ${e.message}`,
        uri: doc.sourceUri,
      });
    }
  }

  return report;
}
