export interface CapabilityRequest {
  requestId: string;
  toolName: string;
  sideEffect: "read" | "write" | "submit";
  agentId?: string;
  clientId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  apiKey?: string;
  sourceId?: string;
}
