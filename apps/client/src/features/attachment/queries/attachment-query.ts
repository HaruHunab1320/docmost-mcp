import api from "@/lib/api-client";
import { IAttachment, IPagination } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface AttachmentsQueryParams {
  page?: number;
  limit?: number;
  spaceId?: string;
  pageId?: string;
  type?: string;
  query?: string;
}

// Function to fetch attachments
export const fetchAttachments = async (
  params: AttachmentsQueryParams = {}
): Promise<IPagination<IAttachment>> => {
  const { page = 1, limit = 20, spaceId, pageId, type, query } = params;

  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());

  if (spaceId) queryParams.append("spaceId", spaceId);
  if (pageId) queryParams.append("pageId", pageId);
  if (type) queryParams.append("type", type);
  if (query) queryParams.append("query", query);

  const response = await api.get(`/attachments?${queryParams.toString()}`);
  return (response as { data?: IPagination<IAttachment> }).data ??
    (response as unknown as IPagination<IAttachment>);
};

// Hook for using the attachments query
export const useAttachmentsQuery = (params: AttachmentsQueryParams = {}) => {
  const { page = 1, limit = 20, spaceId, pageId, type, query } = params;

  return useQuery({
    queryKey: ["attachments", { page, limit, spaceId, pageId, type, query }],
    queryFn: () => fetchAttachments(params),
  });
};

export const deleteAttachment = async (attachmentId: string) => {
  await api.post("/attachments/delete", { attachmentId });
};

export const useDeleteAttachmentMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
      notifications.show({ message: t("Attachment deleted") });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({
        message: errorMessage || t("Failed to delete attachment"),
        color: "red",
      });
    },
  });
};
