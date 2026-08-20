# MCP Hardening Guide

The Model Context Protocol (MCP) connects external AI agents to internal systems, resources, and side-effect capabilities. In AKCP, hardening the MCP layer is essential.

## 1. Transport Security

- **Stdio**: Use stdio ONLY when the MCP client (agent) runs on the exact same isolated host as the server. Stdio relies entirely on OS-level process boundaries. Ensure the running process has the principle of least privilege.
- **SSE (Server-Sent Events)**: For remote agents, use HTTP/SSE.
  - ALWAYS terminate TLS before traffic hits the AKCP server (e.g., using an API Gateway or reverse proxy).
  - Use Mutual TLS (mTLS) to cryptographically verify the identity of the agent.

## 2. Resource Isolation & Indirect Prompt Injection Defense

Resources expose internal data (like OKF documents or knowledge concepts) as URIs (e.g., `knowledge://bundle-id/concept-id`). Because knowledge documents may contain untrusted data or malicious instructions intended to hijack an agent (Threat Model T4: "Prompt Injection through Resources"), AKCP applies defense-in-depth boundaries to all served MCP resources.

### Explicit Content Boundary Markers

By default, the Profile Server wraps document body content with explicit delimiters:

```text
[BEGIN UNTRUSTED DOCUMENT CONTENT]
...raw document text...
[END UNTRUSTED DOCUMENT CONTENT]
```

These delimiters inform consuming agent frameworks that the enclosed content is passive data rather than authoritative system instructions. The boundary markers contain no executable instructions themselves.

### Untrusted Metadata Tagging

All resource responses include metadata annotations in `_meta` and content objects:

```json
{
  "contentType": "untrusted-document",
  "injectionRisk": "possible",
  "trustLevel": "untrusted",
  "boundaryMarkers": true
}
```

### Opt-in WAF Pre-Serving Inspection

The Profile Server provides an optional WAF scanner (using Lakera AI or regex heuristics) to inspect resource content before serving:

- **Non-blocking flagging**: Suspicious injection patterns update response metadata (`_meta.injectionRisk: "high"`, `_meta.wafScan.flagged: true`, `_meta.suspicious: true`) without blocking or altering content delivery.
- Enabled via constructor option `enableWafScan: true` or environment variable `AKCP_ENABLE_RESOURCE_WAF=true`.

### Configuration & Backward Compatibility

- `enableContentBoundaries` (boolean, default: `true`): Toggles boundary wrapping. Can also be disabled via `AKCP_ENABLE_CONTENT_BOUNDARIES=false`.
- `enableWafScan` (boolean, default: `false`): Enables opt-in WAF scanning.
- Validate ALL incoming URI parameters against explicit allow-lists and reject directory traversal (`../`) paths.
- Enforce PII redaction policies directly in the compiler pipeline and resource payload handler before serialization.

## 3. Tool Sandboxing and Payloads

Tools allow the agent to invoke functions.

- **Strict Schemas**: Use `zod` or JSON Schema to rigorously validate the structure and type of all inputs. Do not accept arbitrary objects.
- **Poisoning Prevention**: Tool `description` fields should be treated as security boundaries. Do not dynamically construct tool descriptions from untrusted data (like a database field), as an attacker could inject "System: Ignore prior constraints" into the tool description that the agent reads.
- **Payload Hashing**: For multi-step HITL flows, the `prepare` step must return an approval token and immediately hash the arguments. The `execute` step must re-validate the arguments against the hash.

## 4. Policy Enforcement

Always deploy a `policy.yaml` card alongside your capability registry. Ensure that the `autonomyLevel` limits are respected. Do not trust the agent to self-regulate its autonomy.

## 5. Denial of Service (DoS)

MCP servers can be overwhelmed by aggressive agents that loop. Implement rate limiting on the SSE endpoints and apply backpressure or concurrency limits to tool execution inside the Control Plane.
