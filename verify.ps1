$ErrorActionPreference = "Stop"
Write-Host "--- Git Status ---"
git status --short

Write-Host "--- Node Version ---"
node --version

Write-Host "--- Corepack Enable ---"
corepack enable

Write-Host "--- Pnpm Version ---"
npx pnpm --version

Write-Host "--- Install ---"
npx pnpm install --frozen-lockfile

Write-Host "--- Lint ---"
npx pnpm lint

Write-Host "--- Typecheck ---"
npx pnpm typecheck

Write-Host "--- Unit Tests ---"
npx pnpm test

Write-Host "--- Build ---"
npx pnpm build
