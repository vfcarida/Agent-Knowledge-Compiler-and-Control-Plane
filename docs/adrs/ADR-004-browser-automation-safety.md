# ADR-004: Browser Automation Safety

Date: 2026-07-08

## Status

Accepted

## Context

Browser orchestration frameworks like Playwright are easily weaponized if anti-bot evasion is used.

## Decision

We prohibit evasion flags (like `--disable-blink-features=AutomationControlled`). Default `AUTOMATION_RUNTIME_MODE` is `sandbox`.

## Consequences

The orchestrator will gracefully fail if an ATS blocks it, delegating the final application step back to the human.
