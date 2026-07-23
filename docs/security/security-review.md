# Security Review for Core Contributions

Security is central to AKCP. Because this orchestrator brokers access to organizational knowledge and executes agentic capabilities, changes to the core engine must undergo strict scrutiny.

## What requires a security review?
- Changes to the **Control Plane** (HITL approvals, Audit Log).
- Changes to the **Policy Engine** (how rules are evaluated).
- Changes to the **Capability Registry** or MCP Gateway routing.
- Addition of any network boundary connectors.

## The Review Process

1. **Threat Modeling:** In your PR description, explain how your change affects the STRIDE threat model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
2. **OWASP/NIST Alignment:** Map any new governance controls back to the NIST AI RMF or OWASP LLM Top 10.
3. **CodeQL & Static Analysis:** Ensure all GitHub Actions security checks pass.
4. **Approval:** A core maintainer will perform a specific security code review before the PR can be merged.

## Reporting Vulnerabilities
If you discover a flaw in these engines, do **not** open a PR or public issue. Follow the coordinated disclosure process in [SECURITY.md](../../SECURITY.md).
