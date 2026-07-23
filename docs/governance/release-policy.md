# Release and Versioning Policy

## Semantic Versioning (SemVer)
AKCP packages follow strict [Semantic Versioning 2.0.0](https://semver.org/).
- **MAJOR:** Breaking changes to the public API of `@akcp/core` or breaking changes to the CLI arguments.
- **MINOR:** New, backwards-compatible features, compile targets, or domain profiles.
- **PATCH:** Backwards-compatible bug fixes and security patches.

*Note: While in `0.y.z`, minor versions may contain breaking changes as the API stabilizes.*

## Spec Versioning
Normative specifications (AK-IR, Policy Cards) are versioned independently of the NPM packages. A minor package update will never introduce a breaking spec change. See [Spec Governance](spec-governance.md).

## Changelog Policy
All changes are documented in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. 

## Deprecation Policy
When an API, CLI command, or configuration field is deprecated:
- It will emit a console warning (or TS `@deprecated` tag) for at least **two minor versions** (N-2) before being removed.
- A clear migration path must be provided in the release notes.

## Package Publication
Official releases are published to NPM under the `@akcp` scope automatically via GitHub Actions upon tagging a commit `vX.Y.Z`.
