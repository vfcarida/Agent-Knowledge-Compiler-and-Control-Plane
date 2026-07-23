import path from "path";
import {
  FileSystemAdapter,
  FrontmatterParser,
  OKFFileRepository,
} from "@akcp/core";
import type { CheckResult } from "../types.js";

export async function checkStructure(
  bundlePath: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const fsAdapter = new FileSystemAdapter();
  const parser = new FrontmatterParser();

  try {
    const files = await fsAdapter.listFiles(bundlePath, ".md");
    for (const file of files) {
      if (
        file === "index.md" ||
        file === "log.md" ||
        file === "README.md" ||
        file === "WALKTHROUGH.md" ||
        file === "walkthrough.md" ||
        file === "FLAGSHIP_AUDIT.md" ||
        file === "scorecard.md" ||
        file === "AGENTS.md" ||
        file.includes(path.sep + "dist" + path.sep) ||
        file.startsWith("dist" + path.sep) ||
        file.includes(path.sep + "scenarios" + path.sep) ||
        file.startsWith("scenarios" + path.sep) ||
        file.includes(path.sep + "policies" + path.sep) ||
        file.startsWith("policies" + path.sep)
      ) {
        continue;
      }

      const content = await fsAdapter.readFile(path.join(bundlePath, file));
      try {
        const parsed = parser.parse(
          content,
          path.join(bundlePath, file),
          bundlePath,
        );
        if (
          !parsed.frontmatter ||
          typeof parsed.frontmatter.type !== "string"
        ) {
          results.push({
            check: "okf-frontmatter-type",
            target: file,
            passed: false,
            message: 'Missing or invalid "type" field in OKF frontmatter',
          });
        } else {
          results.push({
            check: "okf-frontmatter-type",
            target: file,
            passed: true,
          });
        }
      } catch (e: any) {
        results.push({
          check: "okf-parseable",
          target: file,
          passed: false,
          message: `OKF Parse Error: ${e.message}`,
        });
      }
    }
  } catch (e: any) {
    results.push({
      check: "okf-directory-readable",
      target: bundlePath,
      passed: false,
      message: `Failed to read bundle: ${e.message}`,
    });
  }

  return results;
}

export async function checkSchemaValidity(
  bundlePath: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const fsAdapter = new FileSystemAdapter();
  const parser = new FrontmatterParser();

  try {
    const repo = new OKFFileRepository(fsAdapter, parser, bundlePath);
    await repo.findAll();

    results.push({
      check: "akcp-profile-schema-valid",
      target: bundlePath,
      passed: true,
      message: "All documents match strict profile schemas",
    });
  } catch (e: any) {
    results.push({
      check: "akcp-profile-schema-valid",
      target: bundlePath,
      passed: false,
      message: `Profile Validation Error: ${e.message}`,
    });
  }

  return results;
}

export async function checkControlPlanePolicy(
  bundlePath: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const fsAdapter = new FileSystemAdapter();

  try {
    const configPath = path.join(bundlePath, "akcp.yaml");
    if (await fsAdapter.exists(configPath)) {
      const { loadAkcpConfig } = await import("@akcp/core");
      loadAkcpConfig(configPath);
      results.push({
        check: "akcp-cp-config",
        target: "akcp.yaml",
        passed: true,
      });
    } else {
      results.push({
        check: "akcp-cp-config",
        target: "akcp.yaml",
        passed: false,
        message: "No akcp.yaml found. Cannot verify control plane policies.",
      });
    }
  } catch (e: any) {
    results.push({
      check: "akcp-cp-config",
      target: "akcp.yaml",
      passed: false,
      message: `Control Plane Config Error: ${e.message}`,
    });
  }

  return results;
}
