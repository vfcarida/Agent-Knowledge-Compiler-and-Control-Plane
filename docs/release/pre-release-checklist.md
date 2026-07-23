# Pre-Release Checklist (v0.1.0)

Run `pnpm release:check` to automate most of these.

## Automated Checks
- [ ] `pnpm build` — all packages compile without errors
- [ ] `pnpm test -- --run` — all tests pass
- [ ] No `@ocf/` or `OCF_` references in source code
- [ ] CLI `--help` works
- [ ] No stale artifacts in root directory

## Manual Checks
- [ ] README badges point to correct repo/package names
- [ ] `docs/status.md` maturity levels match reality
- [ ] npm package names in all `package.json` use `@akcp/` scope
- [ ] CHANGELOG.md is up to date
- [ ] No `private: true` on packages intended for publish
- [ ] License file present and correct

## Final Steps
1. Run: `pnpm release:check`
2. Update version: `pnpm -r exec -- npm version 0.1.0`
3. Update CHANGELOG.md with release notes
4. Commit: `git commit -am "chore: release v0.1.0"`
5. Tag: `git tag v0.1.0`
6. Push: `git push && git push --tags`
