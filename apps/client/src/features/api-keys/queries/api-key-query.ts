import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiKey, listApiKeys, revokeApiKey } from "../services/api-key-service";
import type { CreateApiKeyDto } from "../services/api-key-service";
import { notifications } from "@mantine/notifications";

const API_KEYS_QUERY_KEY = ["api-keys"];

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: listApiKeys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to create API key",
        color: "red",
      });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
      notifications.show({
        title: "Success",
        message: "API key revoked successfully",
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to revoke API key",
        color: "red",
      });
    },
  });
}