import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskLabelService } from "../services/task-label-service";
import { CreateLabelParams, UpdateLabelParams } from "../types";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";

export function useTaskLabels() {
  const { data: workspace } = useCurrentWorkspace();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ["task-labels", workspaceId],
    queryFn: () => taskLabelService.listLabels(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCreateTaskLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateLabelParams) => taskLabelService.createLabel(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-labels", variables.workspaceId],
      });
    },
  });
}

export function useUpdateTaskLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UpdateLabelParams) => taskLabelService.updateLabel(params),
    onSuccess: (_data, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ["task-labels"] });
    },
  });
}

export function useDeleteTaskLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) => taskLabelService.deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-labels"] });
    },
  });
}

export function useAssignTaskLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskLabelService.assignLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRemoveTaskLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskLabelService.removeLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
