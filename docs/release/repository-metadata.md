# Repository Metadata & GitHub "About" Checklist

Because GitHub's "About" section and repository metadata cannot be entirely automated via code commits, the maintainer must ensure these settings reflect the true state of the Agent Knowledge Compiler and Control Plane (AKCP) identity.

## Pre-Release / Audit Checklist

When cutting a new major release or auditing repository health, manually verify the following in the GitHub UI (⚙️ Settings / About):

1. [ ] **Description**: Must clearly state "Agent Knowledge Compiler and Control Plane (AKCP)." (Do not mention OCF or Open Career Format).
2. [ ] **Website**: Must point to the canonical documentation site, or remain blank if using GitHub native docs.
3. [ ] **Topics**: Should include relevant tags such as `mcp`, `agents`, `llm`, `knowledge-graph`, `control-plane`. Remove any legacy tags like `ocf` or `career-format`.
4. [ ] **Social Preview Image**: Ensure the preview image (if configured) reflects the AKCP brand and is not referencing legacy projects.
5. [ ] **Include in the home page**: Check the boxes for "Releases", "Packages", and "Environments" if applicable, so users can find the artifacts easily.
