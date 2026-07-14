# MCP Tool Contracts

## Profile Server

- `validate_bundle`: Scans the `.okf` directory and validates against `CareerFrontmatterSchema`. Returns a valid/invalid breakdown.
- `migrate_bundle`: Runs schema migrations. Accepts `write` (boolean).
- `rebuild_indexes`: Regenerates `index.md` files for all collections.

## Automation Server

- `prepare_application`: Takes `jobUrl` and `context`. Returns a secure 15-minute `approvalToken`.
- `confirm_application_submission`: Takes `approvalToken`. Submits the application if authorized.
