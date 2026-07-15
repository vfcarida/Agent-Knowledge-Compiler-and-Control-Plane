# MCP Hardening Guide

The Model Context Protocol (MCP) connects external AI agents to internal systems, resources, and side-effect capabilities. In AKCP, hardening the MCP layer is essential.

## 1. Transport Security

- **Stdio**: Use stdio ONLY when the MCP client (agent) runs on the exact same isolated host as the server. Stdio relies entirely on OS-level process boundaries. Ensure the running process has the principle of least privilege.
- **SSE (Server-Sent Events)**: For remote agents, use HTTP/SSE. 
  - ALWAYS terminate TLS before traffic hits the AKCP server (e.g., using an API Gateway or reverse proxy).
  - Use Mutual TLS (mTLS) to cryptographically verify the identity of the agent.

## 2. Resource Isolation

Resources expose internal data (like OKF documents or database records) as URIs (e.g., `mcp://it-ops/incident-1`).
- Validate ALL incoming URI parameters against explicit allow-lists. 
- Do not use directory traversal (`../`) paths inside resource templates.
- Enforce PII redaction policies directly in the resource payload handler, BEFORE the data is serialized into the MCP JSON-RPC response.

## 3. Tool Sandboxing and Payloads

Tools allow the agent to invoke functions.
- **Strict Schemas**: Use `zod` or JSON Schema to rigorously validate the structure and type of all inputs. Do not accept arbitrary objects.
- **Poisoning Prevention**: Tool `description` fields should be treated as security boundaries. Do not dynamically construct tool descriptions from untrusted data (like a database field), as an attacker could inject "System: Ignore prior constraints" into the tool description that the agent reads.
- **Payload Hashing**: For multi-step HITL flows, the `prepare` step must return an approval token and immediately hash the arguments. The `execute` step must re-validate the arguments against the hash.

## 4. Policy Enforcement

Always deploy a `policy.yaml` card alongside your capability registry. Ensure that the `autonomyLevel` limits are respected. Do not trust the agent to self-regulate its autonomy.

## 5. Denial of Service (DoS)

MCP servers can be overwhelmed by aggressive agents that loop. Implement rate limiting on the SSE endpoints and apply backpressure or concurrency limits to tool execution inside the Control Plane.
