import { describe, it, expect, vi, beforeEach } from "vitest";
import { PiiReport } from "../../privacy/pii-report.js";
import fs from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

describe("PiiReport", () => {
  let report: PiiReport;

  beforeEach(() => {
    vi.clearAllMocks();
    report = new PiiReport();
  });

  it("accumulates findings and generates summary stats", () => {
    report.addFinding("file1.md", {
      type: "EMAIL_ADDRESS",
      value: "user@example.com",
      start: 10,
      end: 26,
      confidence: "high",
    });

    report.addFinding("file2.md", {
      type: "EMAIL_ADDRESS",
      value: "admin@example.com",
      start: 0,
      end: 17,
      confidence: "high",
    });

    report.addFinding("file2.md", {
      type: "PHONE_NUMBER",
      value: "+1-555-0100",
      start: 30,
      end: 41,
      confidence: "medium",
    });

    report.incrementBlocked();

    const data = report.getData();
    expect(data.totalFindings).toBe(3);
    expect(data.blockedCount).toBe(1);
    expect(data.findingsByType["EMAIL_ADDRESS"]).toBe(2);
    expect(data.findingsByType["PHONE_NUMBER"]).toBe(1);
    expect(data.details).toHaveLength(3);
  });

  it("creates directory and writes JSON report to disk", () => {
    report.addFinding("file1.md", {
      type: "API_KEY",
      value: "secret",
      start: 0,
      end: 6,
      confidence: "high",
    });

    report.save("/tmp/out/pii-report.json");

    expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp/out", { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/tmp/out/pii-report.json",
      expect.stringContaining('"totalFindings": 1'),
      "utf-8",
    );
  });
});
