export type ConformanceLevel =
  | 'none'
  | 'OKF-compatible'
  | 'OCF-profile-compatible'
  | 'AKCP-compiler-compatible'
  | 'AKCP-control-plane-compatible';

export interface ConformanceDetail {
  file?: string;
  type: 'error' | 'warning';
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
