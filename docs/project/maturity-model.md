# AKCP Project Maturity Model

The Agent Knowledge Compiler and Control Plane (AKCP) explicitly labels all commands, domains, compile targets, and features according to this project-wide maturity model. This ensures predictable usage and honest expectation-setting for the community.

## Maturity Levels

- **Experimental**: Concept proven, minimal tests, API may change without notice
- **Alpha**: Functional, has tests, API semi-stable, not production-recommended
- **Beta**: Well-tested, API stable, suitable for non-critical production use
- **Stable**: Production-ready, full test coverage, SemVer guarantees
- **Deprecated**: Scheduled for removal, emits warnings

## Standards Enforcement

1. **Explicit Erroring:** Commands that are placeholders or partially implemented must fail loudly (e.g., throwing a `NOT_IMPLEMENTED` error) rather than returning misleading success states.
2. **CLI Tagging:** Any command that is Experimental or Deprecated must explicitly indicate its status in the `--help` description (e.g., `[Experimental]`).
3. **CI Validation:** The repository runs CI checks (`forbidden-words.test.ts`) to ensure marketing phrases like "100% complete" do not contradict the actual test coverage.
