export interface AgentIdentity {
  agentId: string;
  roles?: string[];
  policyCardName: string; // the name of the PolicyCard that governs this agent
}

export interface ClientIdentity {
  clientId: string;
  connectionType: "local-stdio" | "remote-sse" | "internal";
}
