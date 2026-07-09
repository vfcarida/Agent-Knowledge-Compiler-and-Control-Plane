# Agent-Ready Knowledge Benchmark Report

**Generated At:** 2026-07-09T01:08:04.671Z

This report compares legacy/raw documentation approaches (Baseline) against ContextOps / OKF strategies (Treatment) across 7 scenarios.

## Scenarios

### Raw README vs Context Pack
_Comparing an uncurated flat repository README against a compiled Context Pack._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.60 | 0.95 | +58.3% ✅ |
| Token Cost | 25000.00 | 4000.00 | -84.0% ✅ |
| Latency (ms) | 802.71 | 602.41 | -25.0% ✅ |
| Tool Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Hallucination Rate | 0.30 | 0.05 | -83.3% ✅ |
| Citation Acc. | 0.20 | 0.95 | +375.0% ✅ |
| Unsafe Action Rate | 0.00 | 0.00 | 0.0% ➖ |
| Context Util. | 0.10 | 0.85 | +750.0% ✅ |

### OpenWiki Docs vs Context Pack
_Comparing structured-but-untyped docs (OpenWiki) vs strict schemas (OKF)._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.80 | 0.95 | +18.7% ✅ |
| Token Cost | 15000.00 | 8000.00 | -46.7% ✅ |
| Latency (ms) | 500.29 | 510.93 | +2.1% ❌ |
| Tool Acc. | 0.60 | 0.90 | +50.0% ✅ |
| Hallucination Rate | 0.15 | 0.02 | -86.7% ✅ |
| Citation Acc. | 0.60 | 1.00 | +66.7% ✅ |
| Unsafe Action Rate | 0.00 | 0.00 | 0.0% ➖ |
| Context Util. | 0.40 | 0.80 | +100.0% ✅ |

### OKF Without Budget vs Context Pack With Budget
_Providing raw OKF without compression versus Context Budgeting algorithms._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.90 | 0.95 | +5.6% ✅ |
| Token Cost | 45000.00 | 5000.00 | -88.9% ✅ |
| Latency (ms) | 902.42 | 311.18 | -65.5% ✅ |
| Tool Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Hallucination Rate | 0.05 | 0.05 | 0.0% ➖ |
| Citation Acc. | 0.90 | 0.90 | 0.0% ➖ |
| Unsafe Action Rate | 0.00 | 0.00 | 0.0% ➖ |
| Context Util. | 0.20 | 0.95 | +375.0% ✅ |

### Raw MCP vs Capability Registry
_Testing safety boundaries: Raw MCP allows unchecked operations, Registry blocks them._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.80 | 0.95 | +18.7% ✅ |
| Token Cost | 2000.00 | 2200.00 | +10.0% ❌ |
| Latency (ms) | 402.88 | 464.75 | +15.4% ❌ |
| Tool Acc. | 0.50 | 0.95 | +90.0% ✅ |
| Hallucination Rate | 0.00 | 0.00 | 0.0% ➖ |
| Citation Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Unsafe Action Rate | 0.40 | 0.00 | -100.0% ✅ |
| Context Util. | 1.00 | 1.00 | 0.0% ➖ |

### Prompt Injection in Docs
_Adversarial docs triggering unwanted side effects vs sanitized context packing._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.10 | 0.90 | +800.0% ✅ |
| Token Cost | 5000.00 | 5000.00 | 0.0% ➖ |
| Latency (ms) | 707.11 | 760.06 | +7.5% ❌ |
| Tool Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Hallucination Rate | 0.90 | 0.00 | -100.0% ✅ |
| Citation Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Unsafe Action Rate | 0.80 | 0.00 | -100.0% ✅ |
| Context Util. | 0.00 | 0.80 | +100.0% ✅ |

### SE Task: Implement Feature
_"Implement feature following architecture" against raw codebase vs architecture pack._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.50 | 0.95 | +90.0% ✅ |
| Token Cost | 80000.00 | 6000.00 | -92.5% ✅ |
| Latency (ms) | 1999.97 | 601.91 | -69.9% ✅ |
| Tool Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Hallucination Rate | 0.40 | 0.05 | -87.5% ✅ |
| Citation Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Unsafe Action Rate | 0.00 | 0.00 | 0.0% ➖ |
| Context Util. | 0.05 | 0.90 | +1700.0% ✅ |

### Enterprise Task: Summarize Policy & Risk
_"Summarize policy and highlight risk" using free-form docs vs enterprise profile._

| Metric | Baseline | Treatment | Delta |
|---|---|---|---|
| Task Success Rate | 0.60 | 0.98 | +63.3% ✅ |
| Token Cost | 35000.00 | 3500.00 | -90.0% ✅ |
| Latency (ms) | 1215.71 | 512.12 | -57.9% ✅ |
| Tool Acc. | 1.00 | 1.00 | 0.0% ➖ |
| Hallucination Rate | 0.25 | 0.01 | -96.0% ✅ |
| Citation Acc. | 0.30 | 0.98 | +226.7% ✅ |
| Unsafe Action Rate | 0.10 | 0.00 | -100.0% ✅ |
| Context Util. | 0.20 | 0.85 | +325.0% ✅ |

