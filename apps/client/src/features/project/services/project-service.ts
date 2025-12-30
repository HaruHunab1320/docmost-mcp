import api from "@/lib/api-client";
import {
  CreateProjectParams,
  CreateTaskParams,
  Project,
  ProjectListParams,
  Task,
  TaskListBySpaceParams,
  TaskListParams,
  UpdateProjectParams,
  UpdateTaskParams,
  TaskTriageSummary,
} from "../types";
import { IPagination } from "@/lib/types";

// Check if we're in development mode
const isDevelopment = import.meta.env?.DEV;

// Only log in production or if explicitly enabled
const shouldLog =
  !isDevelopment || import.meta.env?.VITE_ENABLE_LOGS === "true";

// Helper function to conditionally log
const conditionalLog = (message: string, data?: any) => {
  if (shouldLog) {
    console.log(message, data);
  }
};

// Helper function to conditionally log errors
const conditionalErrorLog = (message: string, error?: any) => {
  if (shouldLog || error?.response?.status >= 400) {
    console.error(message, error);
  }
};

// Restore the original endpoint pattern
const PROJECTS_ENDPOINT = "projects";
const TASKS_ENDPOINT = "tasks";

// Use camelCase for REST endpoints instead of kebab-case
const TASK_ENDPOINTS = {
  INFO: "info",
  LIST_BY_PROJECT: "listByProject",
  LIST_BY_SPACE: "listBySpace",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  ASSIGN: "assign",
  COMPLETE: "complete",
  MOVE_TO_PROJECT: "moveToProject",
  TRIAGE_SUMMARY: "triageSummary",
};

export const projectService = {
  // Project endpoints
  async getProjectById(projectId: string): Promise<Project> {
    const { data } = await api.post(`${PROJECTS_ENDPOINT}/info`, { projectId });
    return data;
  },

  async listProjects(params: ProjectListParams): Promise<any> {
    conditionalLog("Project service: listProjects called with params:", params);
    console.log("Fetching projects with params:", params);

    try {
      const response = await api.post(`${PROJECTS_ENDPOINT}/list`, params);

      console.log("Project listProjects API response:", {
        status: response.status,
        fullResponse: response,
        data: response.data,
        keys: Object.keys(response.data),
      });

      return response.data;
    } catch (error) {
      console.error("Project listProjects API error:", {
        message: error.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
      });

      // Return empty result instead of mock data
      return { items: [], meta: { total: 0 } };
    }
  },

  async createProject(params: CreateProjectParams): Promise<Project> {
    console.time("project-creation");
    console.log(
      "Project service: Starting createProject API call",
      new Date().toISOString()
    );

    try {
      const { data } = await api.post(`${PROJECTS_ENDPOINT}/create`, params);
      console.log(
        "Project service: Completed createProject API call",
        new Date().toISOString()
      );
      console.timeEnd("project-creation");
      return data;
    } catch (error) {
      console.error("Project service: Error in createProject", error);
      console.timeEnd("project-creation");
      throw error;
    }
  },

  async updateProject(params: UpdateProjectParams): Promise<Project> {
    conditionalLog(
      "Project service: updateProject called with params:",
      params
    );

    // Enhanced debugging
    console.log("UpdateProject API request details:", {
      endpoint: `${PROJECTS_ENDPOINT}/update`,
      fullParams: params,
      projectId: params.projectId,
    });

    try {
      // Log the actual API call
      console.log(`Making POST request to: /api/${PROJECTS_ENDPOINT}/update`);

      const { data } = await api.post(`${PROJECTS_ENDPOINT}/update`, params);

      conditionalLog(
        "Project service: updateProject successful response:",
        data
      );
      return data;
    } catch (error) {
      conditionalErrorLog("Project service: updateProject error:", error);
      console.error("Full error details:", {
        message: error.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
      });
      throw error;
    }
  },

  async createProjectPage(projectId: string): Promise<Project> {
    const { data } = await api.post(`${PROJECTS_ENDPOINT}/create-page`, {
      projectId,
    });
    return data;
  },

  async deleteProject(projectId: string): Promise<{ success: boolean }> {
    const { data } = await api.post(`${PROJECTS_ENDPOINT}/delete`, {
      projectId,
    });
    return data;
  },

  async archiveProject(
    projectId: string,
    isArchived: boolean
  ): Promise<Project> {
    const { data } = await api.post(`${PROJECTS_ENDPOINT}/archive`, {
      projectId,
      isArchived,
    });
    return data;
  },

  // Task endpoints
  async getTaskById(taskId: string): Promise<Task> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.INFO}`,
      { taskId }
    );
    return data;
  },

  async getTaskByPageId(pageId: string): Promise<Task | null> {
    if (!pageId) {
      return null;
    }

    try {
      const { data } = await api.post(`${TASKS_ENDPOINT}/byPage`, { pageId });
      return data ?? null;
    } catch (error) {
      console.error("Error fetching task by page:", error);
      return null;
    }
  },

  async listTasksByProject(params: TaskListParams): Promise<IPagination<Task>> {
    // Validate that projectId is not empty
    if (!params.projectId) {
      console.error(
        "Project service: listTasksByProject called with empty projectId"
      );
      return {
        items: [],
        meta: {
          limit: 10,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    try {
      const { data } = await api.post(
        `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.LIST_BY_PROJECT}`,
        params
      );
      return data;
    } catch (error) {
      console.error("Error fetching tasks by project:", error);
      return {
        items: [],
        meta: {
          limit: 10,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  async listTasksBySpace(
    params: TaskListBySpaceParams
  ): Promise<IPagination<Task>> {
    // Validate that spaceId is not empty
    if (!params.spaceId) {
      console.error(
        "Project service: listTasksBySpace called with empty spaceId"
      );
      return {
        items: [],
        meta: {
          limit: 10,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    try {
      const { data } = await api.post(
        `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.LIST_BY_SPACE}`,
        params
      );
      return data;
    } catch (error) {
      console.error("Error fetching tasks by space:", error);
      return {
        items: [],
        meta: {
          limit: 10,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  async createTask(params: CreateTaskParams): Promise<Task> {
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.CREATE}`,
      params
    );
    return data;
  },

  async updateTask(params: UpdateTaskParams): Promise<Task> {
    if (!params.taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.UPDATE}`,
      params
    );
    return data;
  },

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.DELETE}`,
      { taskId }
    );
    return data;
  },

  async assignTask(taskId: string, assigneeId?: string): Promise<Task> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.ASSIGN}`,
      {
        taskId,
        assigneeId,
      }
    );
    return data;
  },

  async completeTask(taskId: string, isCompleted: boolean): Promise<Task> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.COMPLETE}`,
      {
        taskId,
        isCompleted,
      }
    );
    return data;
  },

  async moveTaskToProject(taskId: string, projectId?: string): Promise<Task> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.MOVE_TO_PROJECT}`,
      {
        taskId,
        projectId,
      }
    );
    return data;
  },

  async getTriageSummary(
    spaceId: string,
    limit?: number
  ): Promise<TaskTriageSummary> {
    if (!spaceId) {
      throw new Error("Space ID is required");
    }
    const { data } = await api.post(
      `${TASKS_ENDPOINT}/${TASK_ENDPOINTS.TRIAGE_SUMMARY}`,
      {
        spaceId,
        limit,
      }
    );
    return data;
  },
};
