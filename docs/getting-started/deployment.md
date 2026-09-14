# Production Deployment Guide

This guide describes how to deploy the Agent Knowledge Compiler and Control Plane (AKCP) in production environments, covering containerization, distributed rate limiting with Redis, remote MCP server transports, and enterprise security configurations.

## Architecture Topologies

AKCP supports three deployment topologies depending on your agent infrastructure:

| Topology                  | Use Case                                                        | Transport                            | Rate Limiter            | Auth Mechanism                 |
| :------------------------ | :-------------------------------------------------------------- | :----------------------------------- | :---------------------- | :----------------------------- |
| **Local / Embedded**      | Developer workstations, Claude Desktop, Cursor, local pipelines | `stdio`                              | In-memory `TokenBucket` | Local OS user permissions      |
| **Containerized Service** | Team staging, shared dev environments, CI/CD runners            | Docker Compose (HTTP / BFF)          | Local Redis instance    | Demo mode or shared JWT secret |
| **Enterprise Cloud**      | Production autonomous agent platforms, Kubernetes, AWS/GCP      | Streamable HTTP / SSE behind Ingress | Clustered Redis         | OIDC / JWKS token federation   |

---

## 1. Quickstart with Docker Compose

The repository includes a ready-to-use [`docker-compose.yml`](../../docker-compose.yml) that orchestrates:

- **`akcp-control-plane`**: The pre-compiled Control Plane Dashboard BFF and MCP Gateway.
- **`redis`**: Low-latency token-bucket rate limiter and session storage.
- **`otel-collector`** & **`jaeger`** _(optional)_: Distributed tracing and metrics collection.

### Launching the Stack

```bash
# Start the Control Plane and Redis in detached mode
docker compose up -d

# Check service status and health checks
docker compose ps

# View real-time logs
docker compose logs -f akcp-control-plane
```

Once running, navigate to:

- **Control Plane Dashboard**: `http://localhost:3001`
- **Health check endpoint**: `http://localhost:3001/api/health`

### Launching with Observability

To launch with OpenTelemetry and Jaeger trace visualization:

```bash
docker compose --profile observability up -d
```

Jaeger UI will be accessible at `http://localhost:16686`.

---

## 2. Building the Production Docker Image

AKCP uses a multi-stage Alpine-based [`Dockerfile`](../../Dockerfile) that builds all monorepo packages, pre-compiles production knowledge bundles, and drops privileges to a non-root `node` user:

```bash
# Build the production image
docker build -t akcp/control-plane:latest .

# Run standalone container
docker run -d \
  --name akcp-control-plane \
  -p 3001:3001 \
  -e PORT=3001 \
  -e HOST=0.0.0.0 \
  akcp/control-plane:latest
```

---

## 3. Environment Variables Reference

| Variable               | Default                  |   Required   | Description                                                          |
| :--------------------- | :----------------------- | :----------: | :------------------------------------------------------------------- |
| `PORT`                 | `3001`                   |      No      | Port for the Control Plane Dashboard BFF                             |
| `HOST`                 | `0.0.0.0`                |      No      | Host network address to bind to                                      |
| `NODE_ENV`             | `production`             |      No      | Node.js runtime environment                                          |
| `REDIS_URL`            | `redis://localhost:6379` |      No      | Redis connection URL for distributed rate limiting                   |
| `AKCP_JWT_SECRET`      | -                        | Yes (Remote) | HMAC secret for remote MCP HTTP/SSE transport authentication         |
| `AKCP_JWKS_URI`        | -                        |      No      | URI for JSON Web Key Set (JWKS) to validate enterprise OIDC tokens   |
| `DASHBOARD_JWT_SECRET` | -                        |      No      | Secret for securing Dashboard API sessions (when `--no-demo` is set) |
| `LOG_LEVEL`            | `info`                   |      No      | Logging verbosity (`debug`, `info`, `warn`, `error`)                 |

---

## 4. Serving Remote MCP Over HTTP / SSE

To serve knowledge bundles to remote agents (such as web-based agent frameworks or remote orchestrators) over Streamable HTTP:

```bash
# Inside the container or host:
node packages/cli/dist/index.js serve mcp \
  --profile it-operations \
  --ir dist/agent-knowledge-ir.json \
  --transport streamable-http
```

> [!IMPORTANT]
> When serving MCP over remote transports without `stdio`, AKCP requires authentication via `AKCP_JWT_SECRET` or `AKCP_JWKS_URI`. Bypassing this with `--insecure-no-auth` should **only** be used for isolated local development.

---

## 5. Security & Hardening Checklist

When deploying AKCP in enterprise environments:

1. **Run as Non-Root**: The production `Dockerfile` runs as the unprivileged `node` user (UID 1000). Never override this to `root`.
2. **Reverse Proxy TLS Termination**: Place Nginx, Traefik, or an AWS Application Load Balancer in front of AKCP to enforce HTTPS/TLS 1.3.
3. **Fail-Closed Policy Enforcement**: Ensure Policy Cards define explicit `sideEffects.write: deny` or `require_approval` for any mutating tools.
4. **Approval Store Persistence**: When using Human-In-The-Loop approval gates, mount a persistent volume for the SQLite database so pending approval tokens survive container restarts.
5. **Rate Limiting**: Always configure `REDIS_URL` in multi-replica deployments to ensure rate limits are enforced across all instances.

For more details on security configurations, see [MCP Hardening](../security/mcp-hardening.md) and [Threat Model](../security/threat-model.md).
