# Conformance Suite

The Agent Knowledge Compiler and Control Plane (AKCP) provides a strict, machine-readable **Conformance Suite** to certify if your context bundles (OKF directory + `akcp.yaml`) comply with the Agent Knowledge Compiler and Control Plane.

## Usage

You can run the conformance suite on any directory using the AKCP CLI:

```bash
akcp conformance run --bundle path/to/bundle --profile career
```

## How It Works

The conformance runner executes a sequential validation pipeline that maps to our four Compatibility Levels:

1. **OKF-compatible (Base Spec)**: The runner reads all markdown files in your bundle. It ensures each file has valid YAML frontmatter containing a `type: <string>` field.
2. **AKCP-profile-compatible**: The runner loads the files against the selected Agent Knowledge Compiler and Control Plane (AKCP) (AKCP) schema (e.g. `career`). It asserts that all files structurally align with their designated `type` schemas.
3. **AKCP-compiler-compatible**: The runner compiles the bundle into the internal Agent Knowledge Intermediate Representation (IR). It validates semantic links between documents, ensuring there are no unrecoverable parse errors. Broken links are flagged as warnings.
4. **AKCP-control-plane-compatible**: The runner inspects the `akcp.yaml` configuration to ensure policies are well-formed and target outputs are valid.

## Interpreting Output

The command emits a JSON report detailing the highest conformance level achieved, total checks passed, failures, and warnings:

```json
{
  "conformanceLevel": "AKCP-control-plane-compatible",
  "profileDetected": "career",
  "passed": 42,
  "failed": 0,
  "warnings": 1,
  "details": [
    {
      "file": "skills/typescript",
      "type": "warning",
      "message": "Broken dependency link: experiences/non-existent",
      "ruleId": "AKCP-GRAPH-INTEGRITY"
    }
  ]
}
```

If the `conformanceLevel` is `none`, the CLI will exit with a non-zero status code (`1`).
