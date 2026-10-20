import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { syncOpenWikiBidirectional } from "../../connectors/bidirectional-sync.js";

describe("Bidirectional OpenWiki <-> OKF Synchronization", () => {
  let tmpDir: string;
  let okfDir: string;
  let wikiDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-bisync-"));
    okfDir = path.join(tmpDir, "okf");
    wikiDir = path.join(tmpDir, "wiki");
    fs.mkdirSync(okfDir, { recursive: true });
    fs.mkdirSync(wikiDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("exports OKF documents to Wiki and imports new Wiki documents to OKF", async () => {
    fs.writeFileSync(
      path.join(okfDir, "runbook-db.md"),
      `---\nid: runbook-db\ntitle: Database Failover\ntype: Runbook\nsensitivity: restricted\nowners:\n  - sre-team\nttlDays: 30\n---\n\n# Database Failover\n\nStep 1: Promote replica.\n`,
      "utf-8",
    );

    fs.writeFileSync(
      path.join(wikiDir, "onboarding.md"),
      `# Engineer Onboarding\n\nWelcome to the platform team.\n`,
      "utf-8",
    );

    const report = await syncOpenWikiBidirectional({
      okfDir,
      wikiDir,
      direction: "bidirectional",
    });

    expect(report.ok).toBe(true);
    expect(report.summary.exportedToWiki).toBe(1);
    expect(report.summary.importedToOkf).toBe(1);

    const importedOkf = fs.readFileSync(
      path.join(okfDir, "onboarding.md"),
      "utf-8",
    );
    expect(importedOkf).toContain("id: onboarding");
    expect(importedOkf).toContain("title: Engineer Onboarding");
    expect(importedOkf).toContain("sensitivity: internal");

    const exportedWiki = fs.readFileSync(
      path.join(wikiDir, "runbook-db.md"),
      "utf-8",
    );
    expect(exportedWiki).toContain("Step 1: Promote replica.");
    // Sensitive governed fields like owners/sensitivity are kept in OKF, not leaked unnecessarily
    expect(exportedWiki).not.toContain("sre-team");
  });

  it("preserves governed OKF frontmatter when pulling Wiki body updates", async () => {
    fs.writeFileSync(
      path.join(okfDir, "runbook-db.md"),
      `---\nid: runbook-db\ntitle: Database Failover\ntype: Runbook\nsensitivity: restricted\nowners:\n  - sre-team\nttlDays: 30\n---\n\n# Database Failover\n\nStep 1: Promote replica.\n`,
      "utf-8",
    );

    // Initial sync to establish baseBodyHash
    await syncOpenWikiBidirectional({ okfDir, wikiDir });

    // Edit Wiki document body
    fs.writeFileSync(
      path.join(wikiDir, "runbook-db.md"),
      `---\nid: runbook-db\ntitle: Database Failover v2\n---\n\n# Database Failover\n\nStep 1: Promote primary replica.\nStep 2: Verify replication lag.\n`,
      "utf-8",
    );

    const secondSync = await syncOpenWikiBidirectional({ okfDir, wikiDir });
    expect(secondSync.ok).toBe(true);
    expect(secondSync.summary.updatedOkf).toBe(1);

    const updatedOkf = fs.readFileSync(
      path.join(okfDir, "runbook-db.md"),
      "utf-8",
    );
    expect(updatedOkf).toContain("sensitivity: restricted");
    expect(updatedOkf).toContain("sre-team");
    expect(updatedOkf).toContain("ttlDays: 30");
    expect(updatedOkf).toContain("Step 2: Verify replication lag.");
  });

  it("detects 3-way conflicts and respects fail or prefer-wiki strategies", async () => {
    fs.writeFileSync(
      path.join(okfDir, "service.md"),
      `---\nid: service\ntitle: Payment Service\ntype: Service\nsensitivity: confidential\n---\n\nOriginal content.\n`,
      "utf-8",
    );

    // Establish base state
    await syncOpenWikiBidirectional({ okfDir, wikiDir });

    // Modify both OKF and Wiki independently
    fs.writeFileSync(
      path.join(okfDir, "service.md"),
      `---\nid: service\ntitle: Payment Service\ntype: Service\nsensitivity: confidential\n---\n\nOKF modified content.\n`,
      "utf-8",
    );
    fs.writeFileSync(
      path.join(wikiDir, "service.md"),
      `---\nid: service\ntitle: Payment Service\n---\n\nWiki modified content.\n`,
      "utf-8",
    );

    const conflictFail = await syncOpenWikiBidirectional({
      okfDir,
      wikiDir,
      conflictStrategy: "fail",
    });
    expect(conflictFail.ok).toBe(false);
    expect(conflictFail.summary.conflicts).toBe(1);
    expect(conflictFail.conflicts[0].resolution).toBe("unresolved");

    const conflictPreferWiki = await syncOpenWikiBidirectional({
      okfDir,
      wikiDir,
      conflictStrategy: "prefer-wiki",
    });
    expect(conflictPreferWiki.ok).toBe(true);
    expect(conflictPreferWiki.conflicts[0].resolution).toBe("resolved-wiki");

    const mergedOkf = fs.readFileSync(path.join(okfDir, "service.md"), "utf-8");
    expect(mergedOkf).toContain("Wiki modified content.");
    expect(mergedOkf).toContain("sensitivity: confidential");
  });
});
