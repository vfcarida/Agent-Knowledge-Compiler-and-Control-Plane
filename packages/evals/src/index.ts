import fs from "fs";
import path from "path";

export interface BenchmarkMetrics {
  taskSuccess: number; // 0 or 1
  tokenCost: number; // number of tokens
  latencyMs: number; // execution time
  toolSelectionAccuracy: number; // 0 to 1
  hallucinationRate: number; // 0 to 1
  citationAccuracy: number; // 0 to 1
  unsafeActionRate: number; // 0 to 1
  contextUtilization: number; // 0 to 1
}

export interface BenchmarkResult {
  scenario: string;
  description: string;
  baseline: BenchmarkMetrics;
  treatment: BenchmarkMetrics;
}

export interface BenchmarkReport {
  timestamp: string;
  results: BenchmarkResult[];
}

export interface LLMProvider {
  chat(systemPrompt: string, userMessage: string): Promise<{ text: string, tokens: number }>;
}

export class MockLLMProvider implements LLMProvider {
  async chat(_systemPrompt: string, _userMessage: string) {
    // Return a mocked success response
    return { text: "MOCK_RESPONSE: I am avoiding unsafe actions and following the rules.", tokens: 150 };
  }
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
  }

  async chat(systemPrompt: string, userMessage: string) {
    if (!this.apiKey) {
      console.warn("[WARN] OPENAI_API_KEY not set. Falling back to MockLLMProvider.");
      return new MockLLMProvider().chat(systemPrompt, userMessage);
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.0
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API Error: ${res.status} - ${errorText}`);
    }

    const data: any = await res.json();
    return {
      text: data.choices[0].message.content,
      tokens: data.usage?.total_tokens || 0
    };
  }
}

export class EvalsHarness {
  private results: BenchmarkResult[] = [];
  public provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.provider = provider || (process.env.OPENAI_API_KEY ? new OpenAIProvider() : new MockLLMProvider());
  }

  async runScenario(
    name: string,
    description: string,
    baselineRunner: (provider: LLMProvider) => Promise<BenchmarkMetrics>,
    treatmentRunner: (provider: LLMProvider) => Promise<BenchmarkMetrics>,
  ) {
    console.log(`[Evals] Running scenario: ${name}...`);

    let baselineMetrics: BenchmarkMetrics;
    try {
      const startB = performance.now();
      baselineMetrics = await baselineRunner(this.provider);
      baselineMetrics.latencyMs = performance.now() - startB;
    } catch (e: any) {
      console.error(`[Evals] Baseline failed: ${e.message}`);
      baselineMetrics = this.fallbackMetrics();
    }

    let treatmentMetrics: BenchmarkMetrics;
    try {
      const startT = performance.now();
      treatmentMetrics = await treatmentRunner(this.provider);
      treatmentMetrics.latencyMs = performance.now() - startT;
    } catch (e: any) {
      console.error(`[Evals] Treatment failed: ${e.message}`);
      treatmentMetrics = this.fallbackMetrics();
    }

    this.results.push({
      scenario: name,
      description,
      baseline: baselineMetrics,
      treatment: treatmentMetrics,
    });
  }

  private fallbackMetrics(): BenchmarkMetrics {
    return {
      taskSuccess: 0,
      tokenCost: 0,
      latencyMs: 0,
      toolSelectionAccuracy: 0,
      hallucinationRate: 1, // Assume worst case on failure
      citationAccuracy: 0,
      unsafeActionRate: 1, // Assume worst case
      contextUtilization: 0,
    };
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  generateReport(outputDir: string) {
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      results: this.results,
    };

    // 1. Write JSON
    fs.writeFileSync(
      path.join(outputDir, "benchmark-report.json"),
      JSON.stringify(report, null, 2),
    );

    // 2. Write Markdown
    let md = `# Agent-Ready Knowledge Benchmark Report\n\n`;
    md += `**Generated At:** ${report.timestamp}\n\n`;
    md += `This report compares legacy/raw documentation approaches (Baseline) against AKCP / OKF strategies (Treatment) across ${this.results.length} scenarios.\n\n`;

    md += `## Scenarios\n\n`;
    for (const r of this.results) {
      md += `### ${r.scenario}\n`;
      md += `_${r.description}_\n\n`;
      md += `| Metric | Baseline | Treatment | Delta |\n`;
      md += `|---|---|---|---|\n`;

      const metrics: Array<{
        key: keyof BenchmarkMetrics;
        label: string;
        invert: boolean;
      }> = [
        { key: "taskSuccess", label: "Task Success Rate", invert: false },
        { key: "tokenCost", label: "Token Cost", invert: true },
        { key: "latencyMs", label: "Latency (ms)", invert: true },
        { key: "toolSelectionAccuracy", label: "Tool Acc.", invert: false },
        { key: "hallucinationRate", label: "Hallucination Rate", invert: true },
        { key: "citationAccuracy", label: "Citation Acc.", invert: false },
        { key: "unsafeActionRate", label: "Unsafe Action Rate", invert: true },
        { key: "contextUtilization", label: "Context Util.", invert: false },
      ];

      for (const m of metrics) {
        const b = r.baseline[m.key];
        const t = r.treatment[m.key];
        let delta = 0;

        if (b !== 0) {
          delta = ((t - b) / b) * 100;
        } else if (t !== 0) {
          delta = 100; // From 0 to something
        }

        const deltaStr =
          delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;

        // Emoji for delta logic
        let emoji = "➖";
        if (delta < 0) {
          emoji = m.invert ? "✅" : "❌"; // If lower is better (invert=true), decrease is good
        } else if (delta > 0) {
          emoji = m.invert ? "❌" : "✅";
        }

        md += `| ${m.label} | ${b.toFixed(2)} | ${t.toFixed(2)} | ${deltaStr} ${emoji} |\n`;
      }
      md += `\n`;
    }

    fs.writeFileSync(path.join(outputDir, "benchmark-report.md"), md);
    console.log(
      `[Evals] Reports generated at ${outputDir}/benchmark-report.[json|md]`,
    );
  }
}

export { runScenarios } from "./scenarios.js";
