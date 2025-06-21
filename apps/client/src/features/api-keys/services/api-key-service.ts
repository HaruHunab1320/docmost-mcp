import api from "@/lib/api-client";

export interface MCPApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyDto {
  name: string;
}

export interface CreateApiKeyResponse {
  key: string;
  message: string;
}

export async function createApiKey(data: CreateApiKeyDto): Promise<CreateApiKeyResponse> {
  const response = await api.post<CreateApiKeyResponse>("/api-keys", data);
  return response.data;
}

export async function listApiKeys(): Promise<{ keys: MCPApiKey[] }> {
  const response = await api.get<{ keys: MCPApiKey[] }>("/api-keys");
  return response.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`/api-keys/${id}`);
}