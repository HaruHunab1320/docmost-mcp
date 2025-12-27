import api from "@/lib/api-client";
import { CreateLabelParams, UpdateLabelParams } from "../types";

const LABELS_ENDPOINT = "tasks/labels";

export const taskLabelService = {
  async listLabels(workspaceId: string) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/list`, {
      workspaceId,
    });
    return data;
  },

  async createLabel(params: CreateLabelParams) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/create`, params);
    return data;
  },

  async updateLabel(params: UpdateLabelParams) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/update`, params);
    return data;
  },

  async deleteLabel(labelId: string) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/delete`, { labelId });
    return data;
  },

  async assignLabel(taskId: string, labelId: string) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/assign`, {
      taskId,
      labelId,
    });
    return data;
  },

  async removeLabel(taskId: string, labelId: string) {
    const { data } = await api.post(`${LABELS_ENDPOINT}/remove`, {
      taskId,
      labelId,
    });
    return data;
  },
};
