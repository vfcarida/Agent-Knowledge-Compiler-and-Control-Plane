import fs from "node:fs";
import path from "node:path";
import type { PiiMatch } from "./pii-detector.js";

export interface PiiReportData {
  totalFindings: number;
  blockedCount: number;
  findingsByType: Record<string, number>;
  details: Array<{
    file: string;
    type: string;
    start: number;
    end: number;
    confidence: string;
  }>;
}

export class PiiReport {
  private data: PiiReportData = {
    totalFindings: 0,
    blockedCount: 0,
    findingsByType: {},
    details: []
  };

  addFinding(file: string, finding: PiiMatch) {
    this.data.totalFindings++;
    this.data.findingsByType[finding.type] = (this.data.findingsByType[finding.type] || 0) + 1;
    this.data.details.push({
      file,
      type: finding.type,
      start: finding.start,
      end: finding.end,
      confidence: finding.confidence
    });
  }

  incrementBlocked() {
    this.data.blockedCount++;
  }

  getData(): PiiReportData {
    return this.data;
  }

  save(outPath: string) {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(this.data, null, 2), "utf-8");
  }
}
