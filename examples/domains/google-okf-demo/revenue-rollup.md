---
type: "BigQuery Table"
title: "Revenue Nightly Rollup"
description: "Aggregates nightly revenue across all regions into a single fact table."
resource: "bq://example-project.finance.revenue_nightly"
tags: [finance, revenue, nightly]
sources:
  - resource: "sql/revenue_rollup.sql"
    id: rollup-query
    title: "Revenue rollup query"
    author: "human:alice"
    last_modified: "2026-06-01"
generated:
  by: "reference_agent/gemini-2.5-pro"
  at: "2026-06-01T00:00:00Z"
verified:
  by: "human:alice"
  at: "2026-06-02T09:00:00Z"
status: stable
---

# Revenue Nightly Rollup

This table aggregates nightly revenue across all regions, joining raw
transaction events with currency conversion rates. It is the canonical
source for finance dashboards and the `nightly-revenue-check.md` attested
computation that populates it.

## Schema

| Column | Type | Description |
|--------|------|--------------|
| `region` | STRING | ISO region code |
| `revenue_usd` | NUMERIC | Revenue converted to USD |
| `rollup_date` | DATE | The date this row summarizes |
