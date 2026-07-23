# Artifact Integrity and REGAL Grounding

According to the **REGAL** (Registry-Driven Architecture for Deterministic Grounding) and the **NIST AI RMF**, it is critical that AI agents can prove the exact lineage of the context they use for reasoning.
Without this, Agentic AI architectures are susceptible to **Context Poisoning** and supply-chain attacks.

## Current Integrity Model

The Agent Knowledge Compiler implements reproducible builds and artifact integrity via:

1. **Source Tracking:** Hashing all inputs into the compiler.
2. **Deterministic Output:** Removing randomness from targets.
3. **Artifact Integrity:** Writing the SHA-256 hash of all emitted files into a central `akcp-manifest.json`.

Agents or the Control Plane should invoke `akcp verify dist/akcp-manifest.json` before serving a bundle to an LLM.

## Supply Chain Attestation (Implemented)

As of the current release, AKCP extends local hash integrity with cryptographic signing via **Sigstore** (backed by GitHub OIDC):

- **Build Provenance Attestation**: Every release run attests the `packages/*/dist/**` artifacts using `actions/attest-build-provenance`, creating a tamper-evident link between the published binary and the specific CI run.
- **SBOM Attestation**: The `sbom.spdx.json` artifact is separately attested to provide a verifiable chain: source → SBOM → binary artifacts.
- **NPM Provenance**: Packages are published with `--provenance`, allowing consumers to verify package origin via `npm audit signatures`.

Consumers can verify any release artifact:
```bash
gh attestation verify <path/to/artifact> \
  --repo vfcarida/Agent-Knowledge-Compiler-and-Control-Plane
```

See [docs/security/supply-chain.md](supply-chain.md) for complete verification instructions and the current SLSA posture statement.
