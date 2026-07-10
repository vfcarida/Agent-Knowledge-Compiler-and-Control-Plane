Write-Host "--- Git Status ---"
git status --short

Write-Host "--- Node Version ---"
node --version

Write-Host "--- Pnpm Version ---"
npx pnpm --version

Write-Host "--- Install ---"
npx pnpm install --frozen-lockfile

Write-Host "--- Lint ---"
npx pnpm -r run lint

Write-Host "--- Typecheck ---"
npx pnpm -r run typecheck

Write-Host "--- Unit Tests ---"
npx pnpm -r run test

Write-Host "--- Build ---"
npx pnpm -r run build
