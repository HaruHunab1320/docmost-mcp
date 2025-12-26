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
