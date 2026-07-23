---
status: deprecated
superseded-by: ADR-003
---
# 3. Human-in-the-Loop Policy

Date: 2026-07-08

## Status

Accepted

## Context

Autonomous agents applying to jobs without consent violates user trust and can trigger ATS anti-spam measures.

## Decision

All external side effects MUST use a two-step `prepare -> confirm` flow. Tokens expire in 15 minutes.

## Consequences

Agents cannot apply in the background while the user is away.
