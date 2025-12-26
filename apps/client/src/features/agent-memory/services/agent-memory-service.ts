import api from "@/lib/api-client";
import {
  AgentMemoryDay,
  AgentMemoryEntry,
  MemoryEntityDetails,
  MemoryLinksParams,
  MemoryLinksResponse,
  MemoryGraphData,
  MemoryGraphParams,
  MemoryEntityParams,
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

  async graph(params: MemoryGraphParams): Promise<MemoryGraphData> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/graph`, params);
    return data;
  },

  async entity(params: MemoryEntityParams): Promise<AgentMemoryEntry[]> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/entity`, params);
    return data;
  },

  async entityDetails(params: MemoryEntityParams): Promise<MemoryEntityDetails> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/entity-details`, params);
    return data;
  },

  async links(params: MemoryLinksParams): Promise<MemoryLinksResponse> {
    const { data } = await api.post(`${MEMORY_ENDPOINT}/links`, params);
    return data;
  },
};
