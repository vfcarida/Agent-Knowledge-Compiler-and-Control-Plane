import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import crypto from "crypto";
import { FileAuditLogService } from "../../infrastructure/audit-log.js";
import type { AuditEvent } from "../../infrastructure/audit-log.js";

describe("FileAuditLogService", () => {
  const testDir = path.join(process.cwd(), "test-dist");
  const testFile = path.join(testDir, "audit-log.jsonl");

  beforeEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  it("should write valid akcp.audit/v1 events to a file", async () => {
    const service = new FileAuditLogService(testFile);
    const id = await service.logEvent({
      actor: "test-agent",
      requestId: "req-123",
      action: "capability.invoke",
      decision: "allow",
      riskLevel: "low",
      evidence: { payloadHash: "abc" }
    });

    expect(id).toBeDefined();
    expect(fs.existsSync(testFile)).toBe(true);

    const content = fs.readFileSync(testFile, "utf-8").trim().split("\n");
    expect(content.length).toBe(1);

    const event = JSON.parse(content[0]) as AuditEvent;
    expect(event.schemaVersion).toBe("akcp.audit/v1");
    expect(event.eventId).toBe(id);
    expect(event.actor).toBe("test-agent");
    expect(event.decision).toBe("allow");
  });

  it("should read events correctly", async () => {
    const service = new FileAuditLogService(testFile);
    await service.logEvent({
      actor: "agent-1",
      requestId: "req-1",
      action: "policy.evaluate",
      decision: "allow",
      riskLevel: "low",
      evidence: {}
    });
    await service.logEvent({
      actor: "agent-2",
      requestId: "req-2",
      action: "policy.evaluate",
      decision: "deny",
      riskLevel: "high",
      evidence: {}
    });

    const events = await service.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].actor).toBe("agent-1");
    expect(events[1].decision).toBe("deny");
  });
});
