import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "../services/project-service";
import {
  CreateProjectParams,
  Project,
  ProjectListParams,
  UpdateProjectParams,
} from "../types";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";

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

const PROJECTS_QUERY_KEY = "projects";
const PROJECT_QUERY_KEY = "project";

export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, params],
    queryFn: async () => {
      conditionalLog("Fetching projects with params:", params);
      console.log("PROJECT LIST DEBUG - Fetching with params:", params);

      const result = await projectService.listProjects(params);

      console.log("PROJECT LIST DEBUG - Raw API response:", result);
      console.log("PROJECT LIST DEBUG - Projects data structure:", {
        hasDataProperty: !!result.data,
        hasItemsProperty: !!result.items,
        dataIsArray: Array.isArray(result.data),
        itemsIsArray: Array.isArray(result.items),
        dataLength: Array.isArray(result.data)
          ? result.data.length
          : "not an array",
        itemsLength: Array.isArray(result.items)
          ? result.items.length
          : "not an array",
      });

      // If we have projects data, log the first few projects to see their names
      if (Array.isArray(result.data) && result.data.length > 0) {
        console.log(
          "PROJECT LIST DEBUG - First projects from data:",
          result.data.slice(0, 3)
        );
      } else if (Array.isArray(result.items) && result.items.length > 0) {
        console.log(
          "PROJECT LIST DEBUG - First projects from items:",
          result.items.slice(0, 3)
        );
      } else if (
        result.data &&
        typeof result.data === "object" &&
        result.data.items &&
        Array.isArray(result.data.items)
      ) {
        console.log(
          "PROJECT LIST DEBUG - First projects from data.items:",
          result.data.items.slice(0, 3)
        );
      }

      conditionalLog("Projects fetched:", result);
      return result;
    },
    enabled: !!params.spaceId,
    // During hot reloads, don't retry as aggressively
    retry: isDevelopment ? false : 1,
    retryDelay: 1000,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: [PROJECT_QUERY_KEY, projectId],
    queryFn: () => projectService.getProjectById(projectId),
    enabled: !!projectId,
    // During hot reloads, don't retry as aggressively
    retry: isDevelopment ? false : 1,
    retryDelay: 1000,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: CreateProjectParams) => {
      const startTime = performance.now();
      console.log(
        `Create project mutation started at ${new Date().toISOString()}`
      );

      conditionalLog("Creating project with params:", params);
      try {
        const result = await projectService.createProject(params);
        conditionalLog("Project created:", result);

        const endTime = performance.now();
        console.log(
          `Create project mutation completed in ${endTime - startTime}ms at ${new Date().toISOString()}`
        );

        return result;
      } catch (error) {
        const endTime = performance.now();
        console.error(
          `Create project mutation failed after ${endTime - startTime}ms at ${new Date().toISOString()}`,
          error
        );
        throw error;
      }
    },
    onMutate: () => {
      console.log(`onMutate callback started at ${new Date().toISOString()}`);
    },
    onSuccess: (data, variables) => {
      console.log(`onSuccess callback started at ${new Date().toISOString()}`);

      const queryParams = { spaceId: variables.spaceId };
      conditionalLog(
        "Project creation successful, invalidating queries with key:",
        [PROJECTS_QUERY_KEY, queryParams]
      );

      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY, queryParams],
      });

      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY],
      });

      const projectName = data?.name || variables.name || "";

      notifications.show({
        title: t("Project created"),
        message: t("Project {{name}} has been created", {
          name: projectName,
        }),
        color: "green",
      });

      console.log(
        `onSuccess callback completed at ${new Date().toISOString()}`
      );
    },
    onError: (error) => {
      console.log(`onError callback started at ${new Date().toISOString()}`);

      conditionalErrorLog("Project creation error:", error);
      notifications.show({
        title: t("Error"),
        message: t("Failed to create project"),
        color: "red",
      });

      console.log(`onError callback completed at ${new Date().toISOString()}`);
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (params: UpdateProjectParams) =>
      projectService.updateProject(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PROJECT_QUERY_KEY, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY, { spaceId: data.spaceId }],
      });

      const projectName = data?.name || "";

      notifications.show({
        title: t("Project updated"),
        message: t("Project {{name}} has been updated", { name: projectName }),
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: t("Error"),
        message: t("Failed to update project"),
        color: "red",
      });
    },
  });
}

export function useCreateProjectPageMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (projectId: string) =>
      projectService.createProjectPage(projectId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PROJECT_QUERY_KEY, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY, { spaceId: data.spaceId }],
      });

      notifications.show({
        title: t("Project page created"),
        message: t("Project page is ready to open"),
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: t("Error"),
        message: t("Failed to create project page"),
        color: "red",
      });
    },
  });
}

export function useArchiveProjectMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      projectId,
      isArchived,
    }: {
      projectId: string;
      isArchived: boolean;
    }) => projectService.archiveProject(projectId, isArchived),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PROJECT_QUERY_KEY, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY, { spaceId: data.spaceId }],
      });

      const projectName = data?.name || "";

      notifications.show({
        title: data.isArchived
          ? t("Project archived")
          : t("Project unarchived"),
        message: data.isArchived
          ? t("Project {{name}} has been archived", { name: projectName })
          : t("Project {{name}} has been unarchived", { name: projectName }),
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: t("Error"),
        message: t("Failed to archive/unarchive project"),
        color: "red",
      });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      projectId,
      projectName,
    }: {
      projectId: string;
      projectName?: string;
    }) => projectService.deleteProject(projectId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: [PROJECT_QUERY_KEY, variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY],
      });

      const name = variables.projectName || "";

      notifications.show({
        title: t("Project deleted"),
        message: name
          ? t("Project {{name}} has been deleted", { name })
          : t("Project has been deleted"),
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: t("Error"),
        message: t("Failed to delete project"),
        color: "red",
      });
    },
  });
}

export function useSilentUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateProjectParams) =>
      projectService.updateProject(params),
    onSuccess: (data) => {
      // Silently invalidate queries without showing notifications
      queryClient.invalidateQueries({
        queryKey: [PROJECT_QUERY_KEY, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: [PROJECTS_QUERY_KEY, { spaceId: data.spaceId }],
      });
    },
    // No onError notification - only log the error
    onError: (error) => {
      conditionalErrorLog("Silent project update error:", error);
    },
  });
}
