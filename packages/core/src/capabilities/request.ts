
export interface CapabilityRequest {
  requestId: string;
  toolName: string;
  sideEffect: 'read' | 'write' | 'submit';
  agentId?: string;
  clientId?: string;
  payload: any;
}
