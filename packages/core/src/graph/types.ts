export interface GraphNode {
  conceptId: string;
  type: string;
  byteSize: number;
  filePath: string;
}

export interface GraphEdge {
  sourceConceptId: string;
  targetConceptId: string;
  relationType: string;
  isBroken?: boolean;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeGraphSummary {
  totalNodes: number;
  totalEdges: number;
  brokenLinks: GraphEdge[];
  orphanedConcepts: string[];
  highlyConnectedConcepts: string[];
}

export interface ImpactMap {
  [conceptId: string]: string[];
}
