# Security Policy

## Supported Versions

Only the latest release of the Agent Knowledge Compiler and Control Plane (AKCP) is actively supported for security updates.

| Version  | Supported |
| -------- | --------- |
| >= 0.1.0 | Yes       |

## Reporting a Vulnerability

We take the security of organizational knowledge and automated agent credentials seriously. If you discover a vulnerability, please report it to us following these guidelines:

1.  **Do Not File Public Issues**: Avoid filing public issues for potential security vulnerabilities.
2.  **Submit a Security Report**: Send a detailed description of the vulnerability, including steps to reproduce, to the project maintainers via [GitHub Security Advisories](https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/security/advisories/new) (preferred) or via the **"Report a vulnerability"** button on the Security tab of this repository.
3.  **Coordinated Disclosure**: We aim to acknowledge receipt within 48 hours and resolve vulnerabilities within 30 days of receipt before releasing details publicly.
4.  **Incident Response**: Critical vulnerabilities that impact data privacy or agent autonomy will trigger an immediate out-of-band release and a security advisory.

## Safe Harbor

We support security research conducted in good faith. If you discover a security issue while running AKCP locally on your sandbox machines or static fixtures, we will coordinate resolution without legal action, provided you adhere to this policy.

## Security Review for Core Contributions

If you are contributing changes to the **Control Plane, Policy Engine, Capability Registry**, or any other security-sensitive area of AKCP, your PR will require a formal security review. 

We evaluate all engine changes against the **NIST AI RMF** and the **OWASP LLM Top 10** frameworks. Please read the [Security Review Contribution Guide](docs/security/security-review.md) before submitting your PR to understand our threat model and required safeguards.
