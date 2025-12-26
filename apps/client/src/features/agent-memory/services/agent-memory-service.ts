import api from "@/lib/api-client";
import {
  AgentMemoryDay,
  AgentMemoryEntry,
  MemoryDailyParams,
  MemoryDaysParams,
  MemoryIngestParams,
  MemoryQueryParams,
} from "@/features/agent-memory/types";

const MEMORY_ENDPOINT = "memory";

export const agentMemoryService = {
  async ingest(params: MemoryIngestParams): Promise<AgentMemoryEntry> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/ingest`, params);
    return data;
  },

  async query(params: MemoryQueryParams): Promise<AgentMemoryEntry[]> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/query`, params);
    return data;
  },

  async daily(params: MemoryDailyParams): Promise<AgentMemoryEntry[]> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/daily`, params);
    return data;
  },

  async days(params: MemoryDaysParams): Promise<AgentMemoryDay[]> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/days`, params);
    return data;
  },
};
