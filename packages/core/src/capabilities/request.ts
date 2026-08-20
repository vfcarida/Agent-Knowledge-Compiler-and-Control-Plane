export interface CapabilityRequest {
  requestId: string;
  toolName: string;
  sideEffect: "read" | "write" | "submit";
  agentId?: string;
  clientId?: string;
  /** The capability's declared risk level (low/medium/high/critical), so
   * policy rules scoped by risk level can actually be enforced. Falls back
   * to "medium" in MCPGateway if omitted. */
  riskLevel?: string;
  payload: unknown;
  apiKey?: string;
  sourceId?: string;
}
