import { describe, it, expect } from 'vitest';
import { ConformanceRunner } from '../runner.js';
import path from 'path';

describe('ConformanceRunner', () => {
  const getFixturePath = (name: string) => path.resolve(__dirname, '../../fixtures', name);

  it('detects minimal OKF compliance', async () => {
    const runner = new ConformanceRunner(getFixturePath('okf-valid-minimal'));
    const report = await runner.run();
    // It passes Level 1, 2, and 3 (no akcp.yaml so it fails level 4)
    expect(report.conformanceLevel).toBe('AKCP-compiler-compatible');
    expect(report.passed).toBeGreaterThan(0);
    expect(report.failed).toBe(0);
  });

  it('fails on missing type', async () => {
    const runner = new ConformanceRunner(getFixturePath('okf-invalid-missing-type'));
    const report = await runner.run();
    expect(report.conformanceLevel).toBe('none');
    expect(report.failed).toBeGreaterThan(0);
  });

  it('detects broken links as warnings', async () => {
    const runner = new ConformanceRunner(getFixturePath('okf-warning-broken-link'));
    const report = await runner.run();
    expect(report.warnings).toBeGreaterThan(0);
  });

  it('passes all levels for full AKCP setup', async () => {
    const runner = new ConformanceRunner(getFixturePath('akcp-valid-ir'));
    const report = await runner.run();
    expect(report.conformanceLevel).toBe('AKCP-control-plane-compatible');
    expect(report.failed).toBe(0);
  });

  it('fails level 4 if policy is invalid', async () => {
    const runner = new ConformanceRunner(getFixturePath('akcp-invalid-policy'));
    const report = await runner.run();
    // Will fail at policy loading but pass up to Level 3
    expect(report.conformanceLevel).toBe('AKCP-compiler-compatible');
    expect(report.failed).toBe(1);
    expect(report.details.some(d => d.ruleId === 'AKCP-CP-CONFIG')).toBe(true);
  });
});
