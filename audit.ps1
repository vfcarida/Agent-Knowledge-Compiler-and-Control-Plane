$ErrorActionPreference = "Stop"

Write-Host "Running install..."
npx pnpm install --frozen-lockfile

Write-Host "Running lint..."
npx pnpm lint

Write-Host "Running typecheck..."
npx pnpm typecheck

Write-Host "Running build..."
npx pnpm build

Write-Host "Running unit tests..."
npx pnpm test

Write-Host "Running evals..."
npx pnpm evals

Write-Host "Running bundle validation..."
npx pnpm validate:bundle --bundle sample-data/.okf --format json

Write-Host "Audit scripts completed."
