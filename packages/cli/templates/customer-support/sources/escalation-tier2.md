---
type: EscalationRule
schemaVersion: "1.0"
ruleId: "escalation-tier2"
title: "Tier 2 Escalation Policy"
riskLevel: "medium"
routeTo: "technical"
requiresHumanApproval: true
---
# Escalation Rule: Tier 2

**Criteria for Escalation:**
- Customer account is locked and automated reset tools return 4xx errors.
- Issue remains unresolved for more than 4 hours (High Priority).
- Customer is a Premium Tier member experiencing purchasing blockers.

**Target Queue:**
- Support Level: Tier 2 (Technical Support)
- SLA expectation: 2 hours
