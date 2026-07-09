import type { EvalsHarness, BenchmarkMetrics } from './index.js';

const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createMetrics = (overrides: Partial<BenchmarkMetrics>): BenchmarkMetrics => ({
  taskSuccess: 1,
  tokenCost: 1000,
  latencyMs: 1000,
  toolSelectionAccuracy: 1,
  hallucinationRate: 0,
  citationAccuracy: 1,
  unsafeActionRate: 0,
  contextUtilization: 1,
  ...overrides,
});

export async function runScenarios(harness: EvalsHarness) {
  
  await harness.runScenario(
    'Raw README vs Context Pack',
    'Comparing an uncurated flat repository README against a compiled Context Pack.',
    async () => {
      await mockDelay(800); // Baseline is faster to fetch but costs more
      return createMetrics({
        taskSuccess: 0.6,
        tokenCost: 25000,
        hallucinationRate: 0.3,
        citationAccuracy: 0.2,
        contextUtilization: 0.1, // only 10% of the token cost was useful
      });
    },
    async () => {
      await mockDelay(600); // Treatment parses OKF
      return createMetrics({
        taskSuccess: 0.95,
        tokenCost: 4000,
        hallucinationRate: 0.05,
        citationAccuracy: 0.95,
        contextUtilization: 0.85,
      });
    }
  );

  await harness.runScenario(
    'OpenWiki Docs vs Context Pack',
    'Comparing structured-but-untyped docs (OpenWiki) vs strict schemas (OKF).',
    async () => {
      await mockDelay(500);
      return createMetrics({
        taskSuccess: 0.8,
        tokenCost: 15000,
        toolSelectionAccuracy: 0.6,
        hallucinationRate: 0.15,
        citationAccuracy: 0.6,
        contextUtilization: 0.4,
      });
    },
    async () => {
      await mockDelay(500);
      return createMetrics({
        taskSuccess: 0.95,
        tokenCost: 8000,
        toolSelectionAccuracy: 0.9,
        hallucinationRate: 0.02,
        citationAccuracy: 1.0,
        contextUtilization: 0.8,
      });
    }
  );

  await harness.runScenario(
    'OKF Without Budget vs Context Pack With Budget',
    'Providing raw OKF without compression versus Context Budgeting algorithms.',
    async () => {
      await mockDelay(900);
      return createMetrics({
        taskSuccess: 0.9,
        tokenCost: 45000, // Blows up token cost
        hallucinationRate: 0.05,
        citationAccuracy: 0.9,
        contextUtilization: 0.2,
      });
    },
    async () => {
      await mockDelay(300); // Balanced mode drops large bodies
      return createMetrics({
        taskSuccess: 0.95,
        tokenCost: 5000,
        hallucinationRate: 0.05,
        citationAccuracy: 0.9,
        contextUtilization: 0.95,
      });
    }
  );

  await harness.runScenario(
    'Raw MCP vs Capability Registry',
    'Testing safety boundaries: Raw MCP allows unchecked operations, Registry blocks them.',
    async () => {
      await mockDelay(400);
      return createMetrics({
        taskSuccess: 0.8,
        tokenCost: 2000,
        toolSelectionAccuracy: 0.5,
        unsafeActionRate: 0.4, // Agent hallucinates params and commits dangerous actions
      });
    },
    async () => {
      await mockDelay(450);
      return createMetrics({
        taskSuccess: 0.95,
        tokenCost: 2200,
        toolSelectionAccuracy: 0.95,
        unsafeActionRate: 0.0, // Strictly blocked by HITL capabilities
      });
    }
  );

  await harness.runScenario(
    'Prompt Injection in Docs',
    'Adversarial docs triggering unwanted side effects vs sanitized context packing.',
    async () => {
      await mockDelay(700);
      return createMetrics({
        taskSuccess: 0.1, // Fails original task
        tokenCost: 5000,
        hallucinationRate: 0.9,
        unsafeActionRate: 0.8, // Follows injected instructions
        contextUtilization: 0.0,
      });
    },
    async () => {
      await mockDelay(750);
      return createMetrics({
        taskSuccess: 0.9,
        tokenCost: 5000,
        hallucinationRate: 0.0,
        unsafeActionRate: 0.0, // OCF parses frontmatter and ignores execution blocks
        contextUtilization: 0.8,
      });
    }
  );

  await harness.runScenario(
    'SE Task: Implement Feature',
    '"Implement feature following architecture" against raw codebase vs architecture pack.',
    async () => {
      await mockDelay(2000); // Raw codebase search
      return createMetrics({
        taskSuccess: 0.5,
        tokenCost: 80000,
        latencyMs: 15000, // Heavy agent looping
        hallucinationRate: 0.4,
        contextUtilization: 0.05,
      });
    },
    async () => {
      await mockDelay(600); // Direct architecture lookup
      return createMetrics({
        taskSuccess: 0.95,
        tokenCost: 6000,
        latencyMs: 2000,
        hallucinationRate: 0.05,
        contextUtilization: 0.9,
      });
    }
  );

  await harness.runScenario(
    'Enterprise Task: Summarize Policy & Risk',
    '"Summarize policy and highlight risk" using free-form docs vs enterprise profile.',
    async () => {
      await mockDelay(1200);
      return createMetrics({
        taskSuccess: 0.6,
        tokenCost: 35000,
        hallucinationRate: 0.25, // Misses nuanced risks
        citationAccuracy: 0.3,
        unsafeActionRate: 0.1,
        contextUtilization: 0.2,
      });
    },
    async () => {
      await mockDelay(500);
      return createMetrics({
        taskSuccess: 0.98,
        tokenCost: 3500,
        hallucinationRate: 0.01,
        citationAccuracy: 0.98,
        unsafeActionRate: 0.0,
        contextUtilization: 0.85,
      });
    }
  );
}
