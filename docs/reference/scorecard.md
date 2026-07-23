# Agent Knowledge Readiness Scorecard

The **Agent Knowledge Readiness Scorecard** is a public benchmark used to evaluate how well-prepared a context bundle is for autonomous agent consumption.

## Dimensions

The scorecard evaluates 10 dimensions, each worth 10 points (total 100):

1. **Knowledge structure**: Documents are organized semantically (e.g., `skills/`, `experiences/`) rather than dumped in the root.
2. **OKF compatibility**: 100% of the documents contain valid YAML frontmatter specifying their `type`.
3. **Context economy**: Documents are small enough to prevent Context Collapse (average size < 2000 tokens).
4. **MCP readiness**: The `akcp.yaml` specifies MCP server targets for runtime integration.
5. **Policy coverage**: The repository defines governance policies.
6. **Security posture**: Policies explicitly govern PII handling or autonomy constraints.
7. **Provenance**: Cryptographic hashes link the IR to the original Markdown files to prevent tampering.
8. **Evals**: Evaluation datasets or unit tests are included in the bundle.
9. **Freshness**: Stale knowledge is actively managed and updated.
10. **DX (Developer Experience)**: The bundle contains an `index.md` for progressive disclosure and a `log.md` for changelogs.

## Usage

Run the scorecard against any OKF directory or AKCP bundle:

```bash
akcp scorecard --bundle <path> --format markdown
```

This will output a GitHub-friendly markdown report showing your score and actionable recommendations to improve agent readiness.
