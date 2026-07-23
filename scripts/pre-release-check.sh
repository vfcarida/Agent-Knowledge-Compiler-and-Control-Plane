#!/usr/bin/env bash
set -euo pipefail

echo "=== AKCP Pre-Release Check ==="
echo ""

ERRORS=0

# 1. Clean build
echo "[1/8] Clean build..."
if ! pnpm run clean; then
  echo "FAIL: Clean failed"
  ERRORS=$((ERRORS + 1))
fi
if ! pnpm build; then
  echo "FAIL: Build failed"
  ERRORS=$((ERRORS + 1))
fi

# 2. All tests pass
echo "[2/8] Running tests..."
if ! pnpm test -- --run; then
  echo "FAIL: Tests failed"
  ERRORS=$((ERRORS + 1))
fi

# 3. No legacy namespace references in source
echo "[3/8] Checking for legacy namespaces..."
LEGACY=$(grep -rn "@ocf\|OCF_\|OcfBundle\|OCFMcp" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".test." || true)
if [ -n "$LEGACY" ]; then
  echo "FAIL: Legacy namespace found:"
  echo "$LEGACY"
  ERRORS=$((ERRORS + 1))
fi

# 4. No unpinned actions
echo "[4/8] Checking GitHub Actions pinning..."
UNPINNED=$(grep -rn "uses:" .github/workflows/ | grep "@v[0-9]\|@latest\|@main\|@master" || true)
if [ -n "$UNPINNED" ]; then
  echo "WARN: Unpinned actions found:"
  echo "$UNPINNED"
fi

# 5. CLI smoke test
echo "[5/8] CLI smoke test..."
if command -v node > /dev/null; then
  CLI_PATH="packages/cli/dist/index.js"
  if [ -f "$CLI_PATH" ]; then
    if ! node "$CLI_PATH" --help > /dev/null 2>&1; then
      echo "FAIL: CLI --help failed"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "WARN: CLI not built at $CLI_PATH"
  fi
fi

# 6. Package exports resolve
echo "[6/8] Checking package exports..."
for pkg in packages/core packages/cli packages/conformance; do
  if [ -f "$pkg/package.json" ]; then
    MAIN=$(node -e "const p=require('./$pkg/package.json'); console.log(p.main || p.exports?.['.']?.import || 'NONE')")
    if [ "$MAIN" = "NONE" ]; then
      echo "WARN: $pkg has no main/exports entry"
    elif [ ! -f "$pkg/$MAIN" ] && [ ! -f "${pkg}/${MAIN%.js}.js" ]; then
      echo "WARN: $pkg main entry '$MAIN' may not exist after build"
    fi
  fi
done

# 7. No stale artifacts in root
echo "[7/8] Checking for stale root artifacts..."
STALE=""
[ -f "lint-results.json" ] && STALE="$STALE lint-results.json"
[ -f "pnpm-lock.yaml.1147000961" ] && STALE="$STALE pnpm-lock.yaml.1147000961"
[ -f "debug-conformance.ts" ] && STALE="$STALE debug-conformance.ts"
[ -d "scratch/" ] && STALE="$STALE scratch/"
if [ -n "$STALE" ]; then
  echo "WARN: Stale artifacts found:$STALE"
fi

# 8. TypeScript strict (no any casts in core)
echo "[8/8] Checking for 'as any' in core..."
ANY_CASTS=$(grep -rn "as any" packages/core/src/ --include="*.ts" | grep -v ".test." | grep -v "node_modules" || true)
if [ -n "$ANY_CASTS" ]; then
  echo "WARN: 'as any' casts in core (consider fixing):"
  echo "$ANY_CASTS" | head -5
fi

echo ""
echo "=== Results ==="
if [ $ERRORS -eq 0 ]; then
  echo "ALL CHECKS PASSED — ready for v0.1.0 tag"
  exit 0
else
  echo "FAILED: $ERRORS critical check(s) failed"
  exit 1
fi
