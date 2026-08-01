---
type: "Attested Computation"
title: "Nightly Revenue Check"
description: "Recomputes and validates the revenue_nightly rollup every night."
tags: [finance, computation]
runtime: bigquery
parameters:
  - name: rollup_date
    type: DATE
    required: true
  - name: region_filter
    type: STRING
    required: false
computation: "sql/revenue_rollup.sql"
executor:
  resource: "runners/bigquery_executor.md"
  receipt: [job_id, executed_sql, rows_written]
attester:
  resource: "verifiers/revenue_rollup_attester.md"
generated:
  by: "process:finance-nightly"
  at: "2026-06-01T02:00:00Z"
status: stable
---

# Nightly Revenue Check

Runs `sql/revenue_rollup.sql` against the prior day's transaction events and
writes the result into `revenue-rollup.md`'s table. The attester
deterministically re-derives the row count and total from the same inputs
and fails the run if they don't match the executor's receipt.
