export interface AgentMemoryEntry {
  id: string;
  summary?: string;
  content?: unknown;
  tags?: string[];
  source?: string;
  timestamp?: string | Date;
}

export interface AgentMemoryDay {
  day: string;
  count: number;
}

export interface MemoryIngestParams {
  workspaceId: string;
  spaceId?: string;
  source: string;
  content?: unknown;
  summary?: string;
  tags?: string[];
  timestamp?: string;
  entities?: Array<{ id: string; type: string; name: string }>;
}

export interface MemoryQueryParams {
  workspaceId: string;
  spaceId?: string;
  query?: string;
  tags?: string[];
  sources?: string[];
  from?: string;
  to?: string;
  limit?: number;
}

export interface MemoryDailyParams {
  workspaceId: string;
  spaceId?: string;
  date?: string;
  limit?: number;
}

export interface MemoryDaysParams {
  workspaceId: string;
  spaceId?: string;
  days?: number;
}

export interface MemoryGraphParams {
  workspaceId: string;
  spaceId?: string;
  tags?: string[];
  sources?: string[];
  from?: string;
  to?: string;
  maxNodes?: number;
  maxEdges?: number;
  minWeight?: number;
}

export interface MemoryGraphNode {
  id: string;
  label: string;
  type: string;
  count: number;
  lastSeen: string | null;
}

export interface MemoryGraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface MemoryGraphData {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
}

export interface MemoryEntityParams {
  workspaceId: string;
  spaceId?: string;
  entityId: string;
  limit?: number;
}

export interface MemoryEntityDetails {
  entity: {
    id: string;
    name: string;
    type: string;
    count: number;
    lastSeen: string | null;
  } | null;
  memories: AgentMemoryEntry[];
}

export interface MemoryLinksParams {
  workspaceId: string;
  spaceId?: string;
  taskIds?: string[];
  goalIds?: string[];
  limit?: number;
}

export interface MemoryLinksResponse {
  taskLinks: Record<string, Array<{ entityId: string; entityName?: string }>>;
  goalLinks: Record<string, Array<{ entityId: string; entityName?: string }>>;
}
