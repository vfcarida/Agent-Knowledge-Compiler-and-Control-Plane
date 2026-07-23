# @akcp/cli

The Agent Knowledge Compiler and Control Plane (AKCP) CLI.

## Usage

```bash
akcp [options] [command]

Commands:
  init [options] [directory]      Initialize a new .agent-context structure
  validate [options] [directory]  Strict offline schema validation of an OKF/Context bundle
  scan [options] [directory]      Analyze repository and suggest context document structures
  compile [options]               Compile Context Packs to specified targets
  inspect [options]               Inspect an AKCP compile manifest
  serve                           Locally serve AKCP capabilities
  evals                           Manage evaluation datasets and runs
  docs                            Manage and diagnose repository documentation
```

### Examples

```bash
akcp init --template it-operations
akcp validate --bundle examples/domains/it-operations --profile it-operations
akcp compile --config examples/domains/it-operations/akcp.yaml
akcp inspect --artifact dist/akcp/artifact-manifest.json
akcp serve mcp --profile it-operations
akcp serve control-plane
akcp evals run --suite it-operations
akcp conformance run
akcp docs doctor
```

This is the main entry point for the Agent Knowledge Compiler and Control Plane (AKCP).
For full usage documentation, see [CLI Reference](../../docs/reference/cli.md).
