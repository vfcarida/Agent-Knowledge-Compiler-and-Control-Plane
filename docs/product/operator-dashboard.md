# ContextOps Operator Dashboard Spec

This document outlines the design and specification for the ContextOps Operator Dashboard, transitioning it from a mere "data viewer" to a proactive Command Center.

## Objective
The dashboard must answer critical operational questions:
- Is my knowledge bundle valid?
- Which tools have high risk?
- Are there pending approvals?
- How much context is this costing?
- Have my evals regressed?

## Navigation & Screens

### 1. Overview
High-level operational metrics (Total Context Size, Pending Approvals, Latest Eval Score).

### 2. Bundle Health
**API:** `POST /api/profile/validate`
**Flow:** Runs the Zod validator against the `.agent-context` directory. Displays errors structurally and provides a "Migrate/Fix" action.

### 3. Documents
List of all OKF markdown files in the bundle, their schema types, and staleness (last updated).

### 4. Context Packs
Visualizes how documents are grouped into budget-friendly context packs.

### 5. MCP Capabilities
Lists all registered MCP tools, categorized by Risk Level (Observe, Advise, Act-With-Approval, Act-Autonomously).

### 6. Approvals
**API:** `GET /api/automation/approvals`, `POST /api/automation/approve`
**Flow:** Queue of pending HITL (Human-in-the-Loop) approvals. Shows the exact tool payload, capability intent, and allows the operator to Approve or Revoke. Dry-runs are highlighted safely.

### 7. Audit Log
History of all agent actions, tool executions, and file modifications.

### 8. Evals
**API:** `GET /api/evals/report`
**Flow:** Displays the summary from the latest Vitest benchmark run (`benchmark-report.json`). Tracks Win Rate, Token Cost, and Tool Selection Accuracy.

### 9. Governance Policies
Overview of how the current configuration maps to NIST AI RMF and OWASP standards.

### 10. Settings
Global dashboard and connection settings.

## Design Principles
1. **Aesthetics Matter:** Use rich dark mode, glassmorphism, and neon accents to create a premium enterprise feel.
2. **Action-Oriented Riska:** Any error state must have a recommended action (e.g., "Run Migration").
3. **Safe Abstractions:** Do not expose raw security tokens or credentials in the UI.
