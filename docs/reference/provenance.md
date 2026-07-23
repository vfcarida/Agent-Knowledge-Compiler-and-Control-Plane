# Bundle Provenance & Cryptographic Hashes

To ensure deterministic grounding for AI agents, every Knowledge Bundle compiled via `akcp` supports cryptographic provenance.

## 1. Provenance Records

During ingestion, every source file (Markdown, OKF snippet) is hashed using SHA-256. This is stored in the intermediate representation (IR) under a `ProvenanceRecord`:

```json
"provenance": {
  "conceptId": "concept-123",
  "sourceFile": "path/to/file.md",
  "sourceHash": "a1b2c3d4...",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

## 2. Build Manifest

When compilation is finished, a `BuildManifest` (`akcp-manifest.json`) is generated containing:

- `buildId` and `timestamp`.
- `configHash`: A stable SHA-256 hash of `akcp.yaml` with all secrets redacted.
- `targets`: An array containing the exact SHA-256 of every output target.

## 3. Verification

Operators can verify that the compiled artifacts exactly match the hashes captured at build time using the `verify` command:

```bash
npx akcp verify dist/akcp-manifest.json
```

If a file was modified (tampered) or is missing, verification will throw a fatal error.
