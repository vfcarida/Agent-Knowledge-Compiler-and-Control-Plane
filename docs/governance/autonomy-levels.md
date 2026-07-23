# Agent Autonomy Levels

AKCP enforces proportional governance over LLMs based on 4 operational tiers.

## 1. Observe

The agent has read-only access to specific, scoped data.

- **Allowed:** `local-read`, `external-read`
- **Blocked:** `local-write`, `external-write`, `external-submit`
- **Use Case:** Audit trails, dashboard summarization.

## 2. Advise

The agent can read data and draft proposals, but cannot commit or execute side-effects.

- **Allowed:** `local-read`, `external-read`, `drafting-tools`
- **Blocked:** `local-write`, `external-submit`
- **Use Case:** Code review assistants, drafting emails.

## 3. Act with Approval (Human-in-the-Loop)

The agent can queue write and submit actions, but execution is blocked until an explicit human cryptographic or session approval is provided.

- **Allowed:** All reads, queued writes.
- **Blocked:** Autonomous `external-submit`.
- **Use Case:** CI/CD deployment agents, financial assistants.

## 4. Act Autonomously

The agent operates with full authority over its assigned Capability scopes.

- **Allowed:** All capabilities mapped in the registry.
- **Use Case:** Automated background syncs, internal log rotations.
