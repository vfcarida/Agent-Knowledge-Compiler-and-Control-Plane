import {
  FileSystemAdapter,
  FrontmatterParser,
  OKFFileRepository,
  buildKnowledgeIR,
  loadAkcpConfig,
  extractGatewayPolicies,
  verifyPolicyInvariants,
  readAndVerifyAttestation,
  type AgentKnowledgeIR,
} from "@akcp/core";

import type {
  ConformanceReport,
  ConformanceDetail,
  ConformanceRunnerOptions,
} from "./types.js";
import path from "path";

const SIDE_EFFECTING_CAPABILITY_TYPES = new Set([
  "local-write",
  "external-write",
  "external-submit",
]);

export class ConformanceRunner {
  private bundlePath: string;
  private profile: string;
  private options: ConformanceRunnerOptions;

  constructor(
    bundlePath: string,
    profile: string = "career",
    options: ConformanceRunnerOptions = {},
  ) {
    this.bundlePath = bundlePath;
    this.profile = profile;
    this.options = options;
  }

  public async run(
    runOptions?: ConformanceRunnerOptions,
  ): Promise<ConformanceReport> {
    const opts = { ...this.options, ...runOptions };
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
          // AGENTS.md is a reserved filename in the wider agent-instructions
          // ecosystem (agents.md) — free-form instructions, not an OKF concept
          // with a `type` field. Every CLI-generated template ships one, so
          // without this exclusion `akcp init` bundles failed their own
          // conformance check before a user changed anything.
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
    let ir: AgentKnowledgeIR | undefined;
    try {
      // Build IR to test semantic graph and index integrity
      ir = await buildKnowledgeIR(this.bundlePath, {
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

        // docs/governance/conformance-levels.md requires "all capabilities have
        // declared risk levels and approval requirements" for this level.
        // riskLevel is already enforced by CapabilitySchema during Level 3's IR
        // build (it's a required field there), so the remaining gap this check
        // closes is requiresApproval being explicitly declared for any
        // capability with a write/submit side effect.
        for (const cap of ir?.capabilities ?? []) {
          const isSideEffecting = SIDE_EFFECTING_CAPABILITY_TYPES.has(
            cap.sideEffects,
          );
          if (isSideEffecting && cap.requiresApproval === undefined) {
            controlPlaneCompatible = false;
            report.failed++;
            report.details.push({
              type: "error",
              message: `Capability "${cap.name}" has side effect "${cap.sideEffects}" but does not declare requiresApproval.`,
              ruleId: "AKCP-CP-APPROVAL-REQUIRED",
            });
          }
        }
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
    } else {
      return report;
    }

    // Level 5 (Opt-in Zero-Trust Attestation): AKCP-zero-trust-attested
    if (opts.verifyZeroTrust && ir) {
      let zeroTrustAttested = true;

      // 1. Formal Policy Invariant Verification
      const gatewayPolicies = extractGatewayPolicies(ir);
      const formalReport = verifyPolicyInvariants(gatewayPolicies);
      if (!formalReport.verified) {
        zeroTrustAttested = false;
        report.failed++;
        report.details.push({
          type: "error",
          message: `Formal policy verification failed with ${formalReport.counterexamples.length} counterexample(s).`,
          ruleId: "AKCP-ZT-FORMAL-POLICY",
        });
      } else {
        report.passed++;
      }

      // 2. Cryptographic Provenance & Optional Ed25519 Attestation Verification
      const candidateManifests = [
        path.join(this.bundlePath, "dist", "akcp-manifest.json"),
        path.join(this.bundlePath, "akcp-manifest.json"),
        path.join(this.bundlePath, "dist", "build-manifest.json"),
        path.join(this.bundlePath, "build-manifest.json"),
      ];

      let foundManifestPath: string | undefined;
      for (const candidate of candidateManifests) {
        if (await fsAdapter.exists(candidate)) {
          foundManifestPath = candidate;
          break;
        }
      }

      if (!foundManifestPath) {
        zeroTrustAttested = false;
        report.failed++;
        report.details.push({
          type: "error",
          message:
            "Missing cryptographic build manifest (akcp-manifest.json) required for AKCP-zero-trust-attested.",
          ruleId: "AKCP-ZT-PROVENANCE-MANIFEST",
        });
      } else {
        report.passed++;
        if (opts.publicKeyPem) {
          const attestationPath =
            foundManifestPath.replace(/\.json$/, "") + ".attestation.json";
          if (!(await fsAdapter.exists(attestationPath))) {
            zeroTrustAttested = false;
            report.failed++;
            report.details.push({
              type: "error",
              message: `Missing Ed25519 signed attestation at ${path.basename(attestationPath)}.`,
              ruleId: "AKCP-ZT-ATTESTATION-SIG",
            });
          } else {
            const verified = await readAndVerifyAttestation(
              attestationPath,
              opts.publicKeyPem,
            );
            if (!verified.valid) {
              zeroTrustAttested = false;
              report.failed++;
              report.details.push({
                type: "error",
                message:
                  "Ed25519 provenance attestation signature verification failed.",
                ruleId: "AKCP-ZT-ATTESTATION-SIG",
              });
            } else {
              report.passed++;
            }
          }
        }
      }

      if (zeroTrustAttested) {
        report.conformanceLevel = "AKCP-zero-trust-attested";
      }
    }

    return report;
  }
}
