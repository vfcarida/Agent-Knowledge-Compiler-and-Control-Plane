# Contributing to AKCP

Welcome! The **Agent Knowledge Compiler and Control Plane (AKCP)** is an open, specification-driven project. We value contributors who help build a safer, more deterministic knowledge infrastructure for AI agents.

## Community Workstreams

The project is organized into the following workstreams. Pick the one that matches your skills and interests:

| Workstream        | Description                                                                     | Good First Task                                                                      |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **compiler**      | The core compilation pipeline: OKF parsing, IR construction, emission targets.  | Add a new output target (e.g., `llms-txt`)                                           |
| **control-plane** | MCP Gateway, Policy evaluation, HITL approvals, Audit logging.                  | Add a new rule type to the Policy Card evaluator                                     |
| **connectors**    | Plugins that pull knowledge from external systems (Notion, Confluence, GitHub). | See [How to Contribute a Connector](docs/guides/create-connector.md) |
| **policies**      | Policy Pack authoring, governance templates, NIST AI RMF mappings.              | Author a new governance policy template                                              |
| **evals**         | Evaluation datasets, grounding benchmarks, adversarial scenarios.               | Add a prompt injection eval scenario                                                 |
| **docs**          | Technical documentation, spec improvements, tutorials, examples.                | Improve a spec section with a concrete example                                       |
| **examples**      | Real-world bundle examples for different domains.                               | Add a new domain example under `examples/domains/`                                   |

---

## Before You Start

1. **Read the spec**: All contributions touching the compiler or control plane should be grounded in the `spec/` documents.
2. **Run pre-checks**: Ensure the repository is healthy before making changes.
   ```bash
   npx pnpm install --frozen-lockfile
   npx pnpm -r run typecheck
   npx pnpm -r run test -- --run
   npx pnpm -r run build
   ```
3. **Open an issue first**: For non-trivial changes, open an issue using the appropriate template to discuss your approach before submitting a PR.

---

## Pull Request Guidelines

- **Small, iterative PRs.** A single PR should do one thing. Large monolithic PRs will be rejected.
- **Tests are mandatory.** All changes to `packages/core` or `packages/cli` require corresponding unit tests. Coverage must not decrease.
- **Spec changes require an RFC.** Any normative change to `spec/` requires a formal RFC. See [docs/rfcs/README.md](docs/governance/rfc-process.md).
- **Conventional Commits.** PR titles and commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/). Examples: `feat: add eval-dataset target`, `fix: correct policy deny logic`, `docs: improve IR spec examples`.
- **Do not credit AI in commits.** Commit messages must read as standard developer-authored notes.

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-Control-Plane.git akcp
cd akcp

# Install all workspace dependencies
npx pnpm install

# Build all packages
npx pnpm -r run build

# Run all tests
npx pnpm -r run test -- --run

# Validate an example OKF bundle
npx akcp validate examples/domains/software-project
```

---

## Good First Issues

Look for issues labelled `good first issue`. The easiest entry points are:

- **Add a new domain example** (`examples/` workstream) — see the [examples/domains/software-project](examples/domains/software-project) as a reference.
- **Add an eval scenario** (`evals` workstream) — add a JSONL fixture in `packages/evals/fixtures/`.
- **Improve a spec example** (`docs` workstream) — add a concrete JSON example to any spec doc in `spec/`.

---

## Contribution Guides

For detailed instructions on contributing specific components, please read our dedicated guides:
- **[Domain Adapters](docs/guides/create-domain-adapter.md)**: How to propose and build a new flagship domain.
- **[Compile Targets](docs/guides/create-compile-target.md)**: How to add a new build-time output target.
- **[Security Review](docs/security/security-review.md)**: How to navigate the threat model and security review for core Engine/Control Plane changes.

For release policies, SemVer, and compatibility, see the [Release Policy](docs/governance/release-policy.md).

---

## Community Standards

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to building an inclusive, respectful community. We strictly adhere to NIST AI RMF and OWASP LLM Top 10 guidelines in all technical decisions.
