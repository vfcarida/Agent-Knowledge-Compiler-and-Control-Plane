# AKCP Performance Benchmarks

Last run: 2026-07-15 | Node: 22.x | Benchmark Runner: Vitest Bench

## Compiler Pipeline

| Bundle Size                                    | Time (avg) | Ops/sec | Memory |
|------------------------------------------------|------------|---------|--------|
| 10 docs                                        | 26.93 ms   | 37.12   | N/A    |
| 100 docs                                       | 92.42 ms   | 10.81   | N/A    |
| 1000 docs                                      | 973.49 ms  | 1.02    | N/A    |
| 100 docs (with provenance)                     | 96.29 ms   | 10.38   | N/A    |
| 100 docs (with privacy redaction)              | 97.04 ms   | 10.30   | N/A    |

*Note: Memory tracking is currently not enabled by default in the vitest bench suite for the compiler due to Node.js garbage collection variability.*

## MCPGateway

| Scenario                                       | Time (avg) | Ops/sec   |
|------------------------------------------------|------------|-----------|
| Simple allow (no policy/audit overhead)        | 13.4 μs    | 74,366.85 |
| Complex policy eval (schema parsing + rules)   | 17.6 μs    | 56,675.92 |

*Note: The MCP Gateway exhibits sub-millisecond overhead per request even when executing complex capability policies, making it suitable for high-throughput, latency-sensitive agent loops.*
