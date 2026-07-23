export type ConformanceLevel =
  | "none"
  | "OKF-compatible"
  | "AKCP-profile-compatible"
  | "AKCP-compiler-compatible"
  | "AKCP-control-plane-compatible";

export interface ConformanceDetail {
  file?: string;
  type: "error" | "warning";
  message: string;
  ruleId?: string;
}

export interface ConformanceReport {
  conformanceLevel: ConformanceLevel;
  profileDetected: string;
  passed: number;
  failed: number;
  warnings: number;
  details: ConformanceDetail[];
}

export interface CheckResult {
  check: string;
  target?: string;
  passed: boolean;
  message?: string;
  severity?: "error" | "warning";
}
