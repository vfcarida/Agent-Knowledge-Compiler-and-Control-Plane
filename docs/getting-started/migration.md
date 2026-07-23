# Backwards Compatibility & Migration

The repository was previously known as Open Career Format (OCF), ContextOps, and Agent-ready Knowledge Reference Architecture. Legacy CLI commands (`ocf`, `agent-ready`) continue to route to the main `akcp` binary while emitting a deprecation warning.

| Legacy Concept | Canonical AKCP Concept | Migration Status |
| --- | --- | --- |
| `Open Career Format (OCF)` | Agent Knowledge Compiler and Control Plane (AKCP) | Identity updated. Internal references are deprecated. |
| `ContextOps` | AKCP Control Plane | Identity updated. |
| `ocf` CLI command | `akcp` | Supported with deprecation warning. |
| `agent-ready` CLI command | `akcp` | Supported with deprecation warning. |
