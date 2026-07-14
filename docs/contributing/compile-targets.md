# Contributing Compile Targets

Compile targets define how AKCP's internal representation (AK-IR) is emitted into consumable formats (e.g. MCP Servers, Markdown wikis, Vector DB dumps).

## How to add a new Compile Target

1. **RFC:** For significant new targets, submit an RFC to ensure the approach aligns with the core engine.
2. **Create the Target:** Add your compiler plugin logic to `packages/core/src/targets/<your-target>.ts`.
3. **Implement the Interface:** Export an async function that accepts the `AgentKnowledgeIR` and an output directory.
4. **Register in Pipeline:** Hook your target into the build pipeline in `packages/core/src/ir/build-ir.ts` based on the `akcp.yaml` target configuration.
5. **Add Tests:** Create rigorous unit tests under `packages/core/src/__tests__/targets/`. The output must be deterministic.
6. **Document:** Update `docs/reference/compile-targets.md`.
