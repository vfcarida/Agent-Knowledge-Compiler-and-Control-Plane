# Google OKF Demo Domain

**Maturity Status:** Demo | **Type:** Interop showcase

Unlike the other example domains, this bundle is written **entirely to Google's real [Open Knowledge Format v0.2 spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)** — no AKCP-specific governance fields (`schemaVersion`, `bundleVersion`, `owner`, `reviewCadenceDays`, ...). It exists to prove AKCP genuinely interoperates with the real spec, not just with its own same-named bundle convention. See [`docs/concepts/okf.md`](../../../docs/concepts/okf.md) for the full explanation of how the two relate.

## What this bundle demonstrates

- **`index.md`** declares `okf_version: "0.2"` — AKCP reads this and surfaces it as `AgentKnowledgeIR.okfVersion` in the compiled output.
- **`revenue-rollup.md`** uses the provenance (`sources`) and trust (`generated`, `verified`) families.
- **`nightly-revenue-check.md`** uses the computation family (`runtime`, `parameters`, `computation`, `executor`, `attester`) for a `type: "Attested Computation"` concept.
- **`onboarding-guide.md`** declares only `type` — the one field the spec actually requires — and compiles identically to the fully-annotated concepts.
- **`legacy-pipeline.md`** uses `status: deprecated` (one of the few values that happens to overlap with AKCP's own lifecycle enum) — AKCP's `LifecycleValidator` picks it up and warns for real, a genuine example of AKCP's own governance features reacting to real-OKF-authored content.
- **`log.md`** is a real OKF changelog; both it and `index.md` are excluded from AKCP's "did this file forget its `type`?" warning, since OKF v0.2 reserves both filenames for structure, not concepts.

## Commands

```bash
# 1. Validate against the generic OKF schema (not a domain profile — this
#    bundle doesn't use any AKCP domain profile's discriminated types)
pnpm akcp validate --bundle examples/domains/google-okf-demo --profile okf

# 2. Compile
pnpm akcp compile --config examples/domains/google-okf-demo/akcp.yaml

# 3. Inspect the build manifest
pnpm akcp inspect --artifact examples/domains/google-okf-demo/dist/akcp-manifest.json
```

See [WALKTHROUGH.md](WALKTHROUGH.md) for a real captured transcript of all three.
