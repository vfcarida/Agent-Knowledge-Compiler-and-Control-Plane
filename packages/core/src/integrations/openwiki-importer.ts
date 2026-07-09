/**
 * @module integrations/openwiki-importer
 * @description Bridges OpenWiki documentation to ContextOps OKF bundles.
 */

import path from 'node:path';
import type { IFileSystemAdapter } from '../domain/interfaces.js';
import { SoftwareProjectDocumentType } from '../domain/profiles/software-project.js';

export type ImportReport = {
  importedFiles: number;
  skippedFiles: number;
  mappings: Array<{ source: string; target: string; type: string }>;
};

/**
 * Parses OpenWiki markdown content and maps it to a SoftwareProject OKF document.
 */
export async function importOpenWiki(
  fs: IFileSystemAdapter,
  inputDir: string,
  outputDir: string,
  dryRun: boolean = false
): Promise<ImportReport> {
  const report: ImportReport = {
    importedFiles: 0,
    skippedFiles: 0,
    mappings: [],
  };

  if (!(await fs.exists(inputDir))) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const files = await fs.listFiles(inputDir);

  for (const relPath of files) {
    if (!relPath.endsWith('.md')) {
      report.skippedFiles++;
      continue;
    }

    const basename = path.basename(relPath, '.md').toLowerCase();
    let type: string = SoftwareProjectDocumentType.DomainConcept; // Default

    if (basename === 'overview') {
      type = SoftwareProjectDocumentType.ProjectOverview;
    } else if (basename === 'architecture') {
      type = SoftwareProjectDocumentType.ArchitectureDecision;
    } else if (basename === 'commands') {
      type = SoftwareProjectDocumentType.Runbook;
    } else if (basename === 'conventions') {
      type = SoftwareProjectDocumentType.CodingConvention;
    } else if (basename === 'testing') {
      type = SoftwareProjectDocumentType.Workflow;
    }

    const fullSourcePath = path.join(inputDir, relPath);
    const content = await fs.readFile(fullSourcePath);
    
    // Inject frontmatter if it doesn't have it
    let finalContent = content;
    if (!content.trim().startsWith('---')) {
      const title = basename.charAt(0).toUpperCase() + basename.slice(1);
      finalContent = `---\ntype: ${type}\ntitle: "${title}"\n---\n\n${content}`;
    }

    const fullTargetPath = path.join(outputDir, relPath);
    
    report.mappings.push({ source: relPath, target: relPath, type });
    report.importedFiles++;

    if (!dryRun) {
      const targetDir = path.dirname(fullTargetPath);
      if (!(await fs.exists(targetDir))) {
        await fs.mkdir(targetDir);
      }
      await fs.writeFile(fullTargetPath, finalContent);
    }
  }

  return report;
}
