import { describe, it, expect } from "vitest";
import { ConformanceRunner } from "../runner.js";
import path from "path";

describe("ConformanceRunner", () => {
  const getFixturePath = (name: string) =>
    path.resolve(__dirname, "../../fixtures", name);

  it("detects minimal OKF compliance", async () => {
    const runner = new ConformanceRunner(getFixturePath("okf-valid-minimal"));
    const report = await runner.run();
    expect(report.conformanceLevel).toBe("AKCP-compiler-compatible");
    expect(report.passed).toBeGreaterThan(0);
    expect(report.failed).toBe(0);
  });

  it("fails on missing type", async () => {
    const runner = new ConformanceRunner(
      getFixturePath("okf-invalid-missing-type"),
    );
    const report = await runner.run();
    expect(report.conformanceLevel).toBe("none");
    expect(report.failed).toBeGreaterThan(0);
  });

  it("detects broken links as warnings", async () => {
    const runner = new ConformanceRunner(
      getFixturePath("okf-warning-broken-link"),
    );
    const report = await runner.run();
    expect(report.warnings).toBeGreaterThan(0);
  });

  it("passes all levels for full AKCP setup", async () => {
    const runner = new ConformanceRunner(getFixturePath("akcp-valid-ir"));
    const report = await runner.run();
    expect(report.conformanceLevel).toBe("AKCP-control-plane-compatible");
    expect(report.failed).toBe(0);
  });

  it("fails level 4 if policy is invalid", async () => {
    const runner = new ConformanceRunner(getFixturePath("akcp-invalid-policy"));
    const report = await runner.run();
    expect(report.conformanceLevel).toBe("AKCP-compiler-compatible");
    expect(report.failed).toBe(1);
    expect(report.details.some((d) => d.ruleId === "AKCP-CP-CONFIG")).toBe(
      true,
    );
  });

  it("passes all levels for the Career flagship domain", async () => {
    const runner = new ConformanceRunner(
      path.resolve(__dirname, "../../../../examples/domains/career"),
    );
    const report = await runner.run();
    expect(report.failed).toBe(0);
    expect(report.conformanceLevel).toBe("AKCP-control-plane-compatible");
  });

  it("passes all levels for the IT Operations flagship domain", async () => {
    const runner = new ConformanceRunner(
      path.resolve(__dirname, "../../../../examples/domains/it-operations"),
    );
    const report = await runner.run();
    expect(report.failed).toBe(0);
    expect(report.conformanceLevel).toBe("AKCP-control-plane-compatible");
  });

  it("passes all levels for the Customer Support flagship domain", async () => {
    const runner = new ConformanceRunner(
      path.resolve(__dirname, "../../../../examples/domains/customer-support"),
    );
    const report = await runner.run();
    expect(report.failed).toBe(0);
    expect(report.conformanceLevel).toBe("AKCP-control-plane-compatible");
  });

  it("enforces Level 5 (AKCP-zero-trust-attested) when verifyZeroTrust is enabled", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const { generateSigningKeyPair, writeSignedAttestation } =
      await import("@akcp/core");

    const tmpBundle = fs.mkdtempSync(
      path.join(os.tmpdir(), "akcp-zt-conformance-"),
    );
    try {
      fs.cpSync(getFixturePath("akcp-valid-ir"), tmpBundle, {
        recursive: true,
      });

      // Without a build manifest, verifyZeroTrust stops at AKCP-control-plane-compatible
      const runnerMissingManifest = new ConformanceRunner(tmpBundle, "career", {
        verifyZeroTrust: true,
      });
      const reportMissing = await runnerMissingManifest.run();
      expect(reportMissing.conformanceLevel).toBe(
        "AKCP-control-plane-compatible",
      );
      expect(
        reportMissing.details.some(
          (d) => d.ruleId === "AKCP-ZT-PROVENANCE-MANIFEST",
        ),
      ).toBe(true);

      // Write a signed manifest + Ed25519 attestation and verify Level 5
      const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
      const manifestPath = path.join(tmpBundle, "akcp-manifest.json");
      const manifest = {
        bundleId: "test-zt-bundle",
        buildId: "build-001",
        createdAt: new Date().toISOString(),
        compilerVersion: "0.2.0",
        sources: [],
        targets: [
          {
            name: "ir-json",
            outputs: ["dist/agent-knowledge-ir.json"],
            hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
        ],
      };
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        "utf-8",
      );
      await writeSignedAttestation(manifest, manifestPath, privateKeyPem);

      const runnerAttested = new ConformanceRunner(tmpBundle, "career", {
        verifyZeroTrust: true,
        publicKeyPem,
      });
      const reportAttested = await runnerAttested.run();
      expect(reportAttested.conformanceLevel).toBe("AKCP-zero-trust-attested");
    } finally {
      fs.rmSync(tmpBundle, { recursive: true, force: true });
    }
  });
});
