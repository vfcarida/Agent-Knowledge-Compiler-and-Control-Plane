# Knowledge Lifecycle

The Agent Knowledge Compiler and Control Plane (AKCP) (OKF) orchestrated by AKCP treats knowledge as living assets. Over time, knowledge decays—APIs change, organizational constraints drift, and skills become obsolete.

To manage this drift systematically, AKCP introduces a **Knowledge Lifecycle**.

## Lifecycle Metadata

Concepts can declare lifecycle metadata in their frontmatter:

```yaml
owner: "@security-team"
lastReviewedAt: "2024-01-01T00:00:00Z"
reviewCadenceDays: 180
status: "active" # active, stale, deprecated, archived
successor: "concepts/new-security-policy"
```

### Freshness & Staleness

The `status` field overrides the computed state. If `status` is omitted or set to `active`, AKCP dynamically computes the **Effective Status** during IR compilation:

- If `lastReviewedAt` + `reviewCadenceDays` is in the past, the concept is automatically considered **STALE**.
- This surfaces early warnings to maintainers without breaking the build.

### Deprecation & Successors

When a concept is no longer relevant (e.g., migrating from an old framework to a new one), it can be marked as `deprecated`.

- **`successor`**: A deprecated concept should point to the replacement `conceptId` using the `successor` field.
- **Traceability**: AKCP's graph analyzer can trace deprecation chains to find the ultimate active successor, enabling seamless "Context Plan" upgrades.

## Auditing Lifecycle

You can inspect the state of the repository's knowledge decay using the CLI:

```bash
akcp lifecycle report
```

This generates a summary report detailing the count of Active, Stale, Deprecated, and Archived documents, listing the IDs of documents requiring attention.

## Impact Analysis

During IR compilation, AKCP will emit warnings if active concepts depend on (`links`) stale or deprecated concepts. This ensures the organization is aware of cascading knowledge rot.
