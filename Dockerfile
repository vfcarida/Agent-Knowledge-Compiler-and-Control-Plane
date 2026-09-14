# syntax=docker/dockerfile:1.4
# ========================================================
# Stage 1: Build & Package
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/conformance/package.json packages/conformance/
COPY packages/mcp-profile-server/package.json packages/mcp-profile-server/
COPY packages/mcp-automation-server/package.json packages/mcp-automation-server/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/evals/package.json packages/evals/
COPY packages/vscode/package.json packages/vscode/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy root configs, packages, and examples
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY examples/ ./examples/

# Compile all workspace packages
RUN pnpm -r run build

# Pre-compile the example bundles so they are ready to serve
RUN node packages/cli/dist/index.js compile --config examples/domains/it-operations/akcp.yaml && \
    node packages/cli/dist/index.js compile --config examples/domains/career/akcp.yaml && \
    node packages/cli/dist/index.js compile --config examples/domains/customer-support/akcp.yaml

# ========================================================
# Stage 2: Production Runtime
# ========================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Install dumb-init for clean process signal termination
RUN apk add --no-cache dumb-init

# Copy built artifacts from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/examples ./examples

# Run as non-root node user for container security
USER node

# Expose Dashboard BFF (3001) and MCP HTTP/SSE transport (8080)
EXPOSE 3001
EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command launches the Control Plane Dashboard BFF
CMD ["node", "packages/cli/dist/index.js", "serve", "dashboard", "--host", "0.0.0.0", "--port", "3001", "--bundle", "examples/domains/it-operations"]
