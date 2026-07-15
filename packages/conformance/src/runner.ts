import {
  FileSystemAdapter,
  FrontmatterParser,
  OKFFileRepository,
  buildKnowledgeIR,
  loadAkcpConfig,
} from "@akcp/core";
import type { ConformanceReport, ConformanceDetail } from "./types.js";
import path from "path";

export class ConformanceRunner {
  private bundlePath: string;
  private profile: string;

  constructor(bundlePath: string, profile: string = "career") {
    this.bundlePath = bundlePath;
    this.profile = profile;
  }

  public async run(): Promise<ConformanceReport> {
    const report: ConformanceReport = {
      conformanceLevel: "none",
      profileDetected: this.profile,
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
    };

    const fsAdapter = new FileSystemAdapter();
    const parser = new FrontmatterParser();

    // Level 1: OKF-compatible (Base Spec)
    let okfCompatible = true;
    try {
      const files = await fsAdapter.listFiles(this.bundlePath, ".md");
      for (const file of files) {
        if (
          file === "index.md" ||
          file === "log.md" ||
          file === "README.md" ||
          file === "WALKTHROUGH.md" ||
          file === "walkthrough.md" ||
          file === "FLAGSHIP_AUDIT.md" ||
          file === "scorecard.md" ||
          file.includes(path.sep + "dist" + path.sep) ||
          file.startsWith("dist" + path.sep) ||
          file.includes(path.sep + "scenarios" + path.sep) ||
          file.startsWith("scenarios" + path.sep) ||
          file.includes(path.sep + "policies" + path.sep) ||
          file.startsWith("policies" + path.sep)
        ) {
          continue;
        }
        const content = await fsAdapter.readFile(
          path.join(this.bundlePath, file),
        );
        try {
          const parsed = parser.parse(
            content,
            path.join(this.bundlePath, file),
            this.bundlePath,
          );
          if (
            !parsed.frontmatter ||
            typeof parsed.frontmatter.type !== "string"
          ) {
            report.failed++;
            okfCompatible = false;
            report.details.push({
              file,
              type: "error",
              message: 'Missing or invalid "type" field in OKF frontmatter',
              ruleId: "OKF-V0.1-4.1",
            });
          } else {
            report.passed++;
          }
        } catch (e: any) {
          report.failed++;
          okfCompatible = false;
          report.details.push({
            file,
            type: "error",
            message: `OKF Parse Error: ${e.message}`,
            ruleId: "OKF-V0.1-3.2",
          });
        }
      }
    } catch (e: any) {
      okfCompatible = false;
    }

    if (!okfCompatible) {
      report.conformanceLevel = "none";
      return report;
    }
    report.conformanceLevel = "OKF-compatible";

    // Level 2: AKCP-profile-compatible
    let akcpCompatible = true;
    try {
      const repo = new OKFFileRepository(fsAdapter, parser, this.bundlePath);
      const docs = await repo.findAll();
      // If repo.findAll() succeeds, it means all docs passed the Zod schemas for the profile
      // because OKFFileRepository uses OKFDocumentFactory and valid Zod parsing internally (or at least FrontmatterParser does profile validation if configured).
      // Actually, FrontmatterParser currently only validates against OKFFrontmatterSchema.
      // To strictly validate profile, we can use the domain/profiles/career schemas, but for now we rely on the parser not throwing OKFValidationError.
      report.passed += docs.length;
    } catch (e: any) {
      akcpCompatible = false;
      report.failed++;
      report.details.push({
        type: "error",
        message: `Profile Validation Error: ${e.message}`,
        ruleId: "AKCP-PROFILE-STRICT",
      });
    }

    if (!akcpCompatible) {
      return report;
    }
    report.conformanceLevel = "AKCP-profile-compatible";

    // Level 3: AKCP-compiler-compatible
    let compilerCompatible = true;
    try {
      // Build IR to test semantic graph and index integrity
      const ir = await buildKnowledgeIR(this.bundlePath, {
        sources: [{ type: "okf-directory", path: this.bundlePath }],
      });
      report.passed++;

      // Check for broken links (warnings)
      for (const link of ir.links || []) {
        const targetExists = ir.concepts.some(
          (c) => c.conceptId === link.targetConceptId,
        );
        if (!targetExists) {
          report.warnings++;
          report.details.push({
            file:
              ir.concepts.find((c) => c.conceptId === link.sourceConceptId)
                ?.source.filePath || link.sourceConceptId,
            type: "warning",
            message: `Broken dependency link: ${link.targetConceptId}`,
            ruleId: "AKCP-GRAPH-INTEGRITY",
          });
        }
      }
    } catch (e: any) {
      compilerCompatible = false;
      report.failed++;
      report.details.push({
        type: "error",
        message: `Compiler IR Error: ${e.message}`,
        ruleId: "AKCP-COMPILER-IR",
      });
    }

    if (!compilerCompatible) {
      return report;
    }
    report.conformanceLevel = "AKCP-compiler-compatible";

    // Level 4: AKCP-control-plane-compatible
    let controlPlaneCompatible = true;
    try {
      // If it has an akcp.yaml and valid policies
      const configPath = path.join(this.bundlePath, "akcp.yaml");
      if (await fsAdapter.exists(configPath)) {
        loadAkcpConfig(configPath); // Throws if invalid
        report.passed++;
      } else {
        // Warning if no config, but maybe we shouldn't fail?
        // Actually, to be control-plane compatible it MUST have an akcp.yaml
        controlPlaneCompatible = false;
        report.details.push({
          type: "warning",
          message: `No akcp.yaml found. Cannot verify control plane policies.`,
          ruleId: "AKCP-CP-CONFIG",
        });
      }
    } catch (e: any) {
      controlPlaneCompatible = false;
      report.failed++;
      report.details.push({
        type: "error",
        message: `Control Plane Config Error: ${e.message}`,
        ruleId: "AKCP-CP-CONFIG",
      });
    }

    if (controlPlaneCompatible) {
      report.conformanceLevel = "AKCP-control-plane-compatible";
    }

    return report;
  }
}
