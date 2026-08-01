---
type: Document
---

# Walkthrough (real captured transcripts)

## 1. Validate

```
$ pnpm akcp validate --bundle examples/domains/google-okf-demo --profile okf

[INFO] Validating bundle at: <repo>/examples/domains/google-okf-demo
# Bundle Validation Report

- **Checked At:** 2026-08-01T15:03:10.413Z
- **Bundle Path:** <repo>/examples/domains/google-okf-demo
- **Profile:** okf
- **Status:** ✅ Valid

## Summary

- Files Checked: 4
- Valid Documents: 4
- Invalid Documents: 0
```

`--profile okf` uses AKCP's base OKF schema directly rather than a domain
profile's discriminated `type` union (career/software-project/it-operations
all reject types they don't know about) — this bundle's `type` values
(`"BigQuery Table"`, `"Attested Computation"`, `"Guide"`, `"Cron Job"`) are
exactly the kind of free-form, domain-specific types real OKF v0.2 allows.

## 2. Compile

```
$ pnpm akcp compile --config examples/domains/google-okf-demo/akcp.yaml

[INFO] Compiling context pack from akcp.yaml (target: all)
[Lifecycle] WARNING: Concept 'legacy-pipeline' is DEPRECATED but has no successor defined.
[Lifecycle] WARNING: 'index' depends on DEPRECATED concept 'legacy-pipeline'.
[INFO] Running target: context-pack -> <repo>/examples/domains/google-okf-demo/dist/context-pack.json
[INFO] Running target: mcp-resources -> <repo>/examples/domains/google-okf-demo/dist/akcp-manifest.json
[OK] Compilation complete. Manifest written to <repo>/examples/domains/google-okf-demo/dist/akcp-manifest.json
```

The two `[Lifecycle]` warnings are AKCP's own governance engine reacting to
`legacy-pipeline.md`'s real-OKF-authored `status: deprecated` — nothing
AKCP-specific had to be added to that file for this to work, since
`deprecated` happens to be one of the few status values both specs share.

The compiled `dist/context-pack.json` records `"okfVersion": "0.2"` — read
directly from this bundle's root `index.md`, not a hardcoded constant.

## 3. Inspect

```
$ pnpm akcp inspect --artifact examples/domains/google-okf-demo/dist/akcp-manifest.json

=== AKCP Artifact Manifest ===
Schema Version: akcp.artifact-manifest/v1
Build ID: bld_f1d320ce
Source Root: <repo>/examples/domains/google-okf-demo
Created At: 2026-08-01T15:03:28.098Z

=== Targets Generated (2) ===
- ir-json (success)
  Outputs: <repo>/examples/domains/google-okf-demo/dist/context-pack.json
  Hash:    c79b640f15234517d077b25792a6c7bee02a5057a3eb953ccc5a3d052c93d2b0
  Size:    9536 bytes
- mcp-resources-manifest (success)
  Outputs: <repo>/examples/domains/google-okf-demo/dist/akcp-manifest.json
  Hash:    013c7006c563121500fada6f4a5681857bc892ad5480b72e6e883f93aace1444
  Size:    1327 bytes
```
