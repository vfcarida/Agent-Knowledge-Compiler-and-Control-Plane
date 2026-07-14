# Contributing Domain Adapters

Domain Adapters are pre-configured bundles of OKF schemas, policies, and sample data that demonstrate how AKCP operates in a specific industry or use case (e.g., IT Operations, Customer Support, Legal Discovery).

## How to add a new Flagship Domain

1. **Open an Issue:** Start by proposing the domain using the `Domain Adapter Proposal` issue template. We want to ensure it highlights a unique capability of AKCP.
2. **Create the Schema:** Add your Zod schemas to `packages/core/src/domain/profiles/<your-domain>.ts`.
3. **Register the Profile:** Add it to `packages/core/src/domain/schemas.ts` and `index.ts`.
4. **Create the Bundle:** Scaffold your domain directory under `examples/domains/<your-domain>/`.
5. **Populate Content:** Add OKF documents to your knowledge folders (e.g. `services/`, `incidents/`).
6. **Define Policies:** Create `.policy.yaml` files defining what agents are allowed to do.
7. **Capabilities:** Provide a realistic `capabilities.json` mapping.
8. **Evals:** Add an `evals/dataset.json` or `.yaml` with test scenarios.
9. **Documentation:** Add a `README.md` and a walkthrough in `docs/walkthroughs/`.
10. **Test:** Run `pnpm akcp validate examples/domains/<your-domain>` and ensure conformance passes.
