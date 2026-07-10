# Artifact Integrity and REGAL Grounding

According to the **REGAL** (Registry-Driven Architecture for Deterministic Grounding) and the **NIST AI RMF**, it is critical that AI agents can prove the exact lineage of the context they use for reasoning. 
Without this, Agentic AI architectures are susceptible to **Context Poisoning** and supply-chain attacks.

## Current Integrity Model
The Agent Knowledge Compiler implements reproducible builds and artifact integrity via:
1. **Source Tracking:** Hashing all inputs into the compiler.
2. **Deterministic Output:** Removing randomness from targets.
3. **Artifact Integrity:** Writing the SHA-256 hash of all emitted files into a central `akcp-manifest.json`.

Agents or the Control Plane should invoke `akcp verify dist/akcp-manifest.json` before serving a bundle to an LLM.

## Future Roadmap (SLSA & Sigstore)
While current integrity prevents accidental or internal tampering, cryptographic signing is required for multi-party trust. In future releases, we will integrate with **Sigstore/SLSA** to sign the `BuildManifest`, proving not only the hash of the bundle, but the identity of the CI system that built it.
