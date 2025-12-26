import api from "@/lib/api-client";
import { Goal } from "@/features/goal/types";

export async function listGoals(params: {
  workspaceId: string;
  spaceId?: string;
}): Promise<Goal[]> {
  const req = await api.post<Goal[]>("/goals/list", params);
  return req.data;
}

export async function createGoal(params: {
  workspaceId: string;
  spaceId?: string;
  name: string;
  horizon: string;
  description?: string;
  keywords?: string[];
}): Promise<Goal> {
  const req = await api.post<Goal>("/goals/create", params);
  return req.data;
}

export async function updateGoal(params: {
  workspaceId: string;
  goalId: string;
  spaceId?: string;
  name?: string;
  horizon?: string;
  description?: string;
  keywords?: string[];
}): Promise<Goal> {
  const req = await api.post<Goal>("/goals/update", params);
  return req.data;
}

export async function deleteGoal(params: {
  workspaceId: string;
  goalId: string;
}): Promise<{ deleted: boolean }> {
  const req = await api.post("/goals/delete", params);
  return req.data;
}

export async function listGoalsForTask(params: {
  workspaceId: string;
  taskId: string;
}): Promise<Goal[]> {
  const req = await api.post<Goal[]>("/goals/by-task", params);
  return req.data;
}

export async function listGoalsForTasks(params: {
  workspaceId: string;
  taskIds: string[];
}): Promise<Array<Goal & { taskId: string }>> {
  const req = await api.post<Array<Goal & { taskId: string }>>(
    "/goals/by-tasks",
    params,
  );
  return req.data;
}

export async function assignGoal(params: {
  taskId: string;
  goalId: string;
}): Promise<{ assigned?: boolean }> {
  const req = await api.post("/goals/assign", params);
  return req.data;
}

export async function unassignGoal(params: {
  taskId: string;
  goalId: string;
}): Promise<{ deleted?: boolean }> {
  const req = await api.post("/goals/unassign", params);
  return req.data;
}
