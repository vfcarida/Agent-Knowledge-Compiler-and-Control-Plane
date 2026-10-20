import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { synthesizeOkfBundle } from "../../synthesis/okf-synthesizer.js";

describe("Autonomous Governed OKF Synthesizer", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-synth-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("infers concept types, elevates sensitivity on PII/secrets, and injects semantic WikiLinks", async () => {
    // 1. Raw service document
    fs.writeFileSync(
      path.join(tmpDir, "payment-gateway.md"),
      `# Payment Gateway\n\nCore payment microservice with 99.99% availability SLA and low latency endpoints.\n`,
      "utf-8",
    );

    // 2. Raw incident document mentioning Payment Gateway and containing an email PII
    fs.writeFileSync(
      path.join(tmpDir, "inc-2026-99.md"),
      `# Outage in Checkout\n\nRoot cause analysis for incident affecting Payment Gateway. Contact oncall lead alice.smith@example.com for details.\n`,
      "utf-8",
    );

    // 3. Raw runbook mentioning Payment Gateway and containing an AWS secret key
    fs.writeFileSync(
      path.join(tmpDir, "rollback-runbook.md"),
      `# Rollback Playbook\n\nRemediation steps to rollback Payment Gateway during Outage in Checkout. Emergency token AKIAIOSFODNN7EXAMPLE.\n`,
      "utf-8",
    );

    const report = await synthesizeOkfBundle({
      inputDir: tmpDir,
      autoLink: true,
    });

    expect(report.ok).toBe(true);
    expect(report.documentsProcessed).toBe(3);
    expect(report.sensitivityElevations).toBe(2);
    expect(report.semanticLinksInjected).toBeGreaterThanOrEqual(2);

    const serviceDoc = report.documents.find(
      (d) => d.conceptId === "payment-gateway",
    )!;
    expect(serviceDoc.type).toBe("Service");
    expect(serviceDoc.sensitivity).toBe("internal");
    expect(serviceDoc.ttlDays).toBe(90);

    const incidentDoc = report.documents.find(
      (d) => d.conceptId === "inc-2026-99",
    )!;
    expect(incidentDoc.type).toBe("Incident");
    expect(incidentDoc.sensitivity).toBe("confidential");
    expect(incidentDoc.sensitivityElevated).toBe(true);
    expect(incidentDoc.ttlDays).toBe(30);
    expect(incidentDoc.autoLinkedConcepts).toContain("payment-gateway");
    expect(incidentDoc.body).toContain("[[payment-gateway|Payment Gateway]]");
    expect(incidentDoc.frontmatter.depends_on).toContain("payment-gateway");

    const runbookDoc = report.documents.find(
      (d) => d.conceptId === "rollback-runbook",
    )!;
    expect(runbookDoc.type).toBe("Runbook");
    expect(runbookDoc.sensitivity).toBe("restricted");
    expect(runbookDoc.detectedPiiTypes).toContain("SECRET_KEY");
    expect(runbookDoc.frontmatter.mitigates).toContain("inc-2026-99");
    expect(runbookDoc.frontmatter.depends_on).toContain("payment-gateway");
  });
});
