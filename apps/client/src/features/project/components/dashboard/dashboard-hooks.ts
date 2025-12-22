import { useMemo } from "react";
import { useTasksBySpace } from "../../hooks/use-tasks";
import { useProjects } from "../../hooks/use-projects";
import { Project, Task } from "../../types";
import { useWorkspaceUsers } from "@/features/user/hooks/use-workspace-users";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";
import { getProjectsArray } from "../../utils/project-data";

/**
 * Hook to fetch and organize dashboard data
 */
export function useDashboardData({ spaceId }: { spaceId: string }) {
  // Fetch projects
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects({
    spaceId,
  });

  // Fetch tasks
  const { data: tasksData, isLoading: isTasksLoading } = useTasksBySpace({
    spaceId,
  });

  // Get workspace users
  const { data: workspace } = useCurrentWorkspace();
  const workspaceId = workspace?.id || "";
  const { data: usersData, isLoading: isUsersLoading } = useWorkspaceUsers({
    workspaceId,
    enabled: !!workspaceId,
  });
  const users = usersData?.items || [];

  // Handle both possible structures from the API
  const projects = useMemo(() => {
    return getProjectsArray(projectsData);
  }, [projectsData]);

  const allTasks = tasksData?.items || [];

  // Aggregate tasks by project
  const tasksByProject = useMemo(() => {
    const taskMap = new Map<string, Task[]>();

    allTasks.forEach((task) => {
      if (!taskMap.has(task.projectId)) {
        taskMap.set(task.projectId, []);
      }
      taskMap.get(task.projectId)?.push(task);
    });

    return taskMap;
  }, [allTasks]);

  // Calculate task statistics
  const taskStats = useMemo(() => {
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(
      (task) => task.status === "done"
    ).length;
    const inProgressTasks = allTasks.filter(
      (task) => task.status === "in_progress"
    ).length;
    const blockedTasks = allTasks.filter(
      (task) => task.status === "blocked"
    ).length;

    const highPriorityTasks = allTasks.filter(
      (task) => task.priority === "high" || task.priority === "urgent"
    ).length;
    const tasksWithDueDate = allTasks.filter((task) => task.dueDate).length;

    // Calculate due soon tasks (due within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const dueSoonTasks = allTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return (
        dueDate > now && dueDate <= sevenDaysFromNow && task.status !== "done"
      );
    });

    // Calculate overdue tasks
    const overdueTasks = allTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < now && task.status !== "done";
    });

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      highPriorityTasks,
      dueSoonTasks: dueSoonTasks.length,
      overdueTasks: overdueTasks.length,
      tasksWithDueDate,
      completionRate,
    };
  }, [allTasks]);

  // Get task distribution by assignee/owner
  const taskDistributionByOwner = useMemo(() => {
    // Initialize a map to track task counts and completion rates by user
    const userTaskMap = new Map<
      string,
      {
        userId: string;
        name: string;
        avatarUrl: string | null;
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
      }
    >();

    // Add "Unassigned" entry
    userTaskMap.set("unassigned", {
      userId: "unassigned",
      name: "Unassigned",
      avatarUrl: null,
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
    });

    // Count tasks per assignee
    allTasks.forEach((task) => {
      const assigneeId = task.assigneeId || "unassigned";

      if (!userTaskMap.has(assigneeId) && assigneeId !== "unassigned") {
        const user = users.find((u) => u.id === assigneeId);
        if (user) {
          userTaskMap.set(assigneeId, {
            userId: user.id,
            name: user.name || user.email.split("@")[0],
            avatarUrl: user.avatarUrl,
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
          });
        } else {
          // If user not found in workspace users, create generic entry
          userTaskMap.set(assigneeId, {
            userId: assigneeId,
            name: "Unknown User",
            avatarUrl: null,
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
          });
        }
      }

      // Update counts
      const userData = userTaskMap.get(assigneeId)!;
      userData.totalTasks += 1;

      if (task.status === "done") {
        userData.completedTasks += 1;
      }

      // Update completion rate
      userData.completionRate =
        userData.totalTasks > 0
          ? (userData.completedTasks / userData.totalTasks) * 100
          : 0;
    });

    // Convert to array and sort by task count (descending)
    return Array.from(userTaskMap.values())
      .filter((data) => data.totalTasks > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }, [allTasks, users]);

  // Get project with most tasks
  const projectWithMostTasks = useMemo(() => {
    if (projects.length === 0) return null;

    let maxTaskCount = 0;
    let projectWithMax: Project | null = null;

    projects.forEach((project) => {
      const taskCount = tasksByProject.get(project.id)?.length || 0;
      if (taskCount > maxTaskCount) {
        maxTaskCount = taskCount;
        projectWithMax = project;
      }
    });

    return {
      project: projectWithMax,
      taskCount: maxTaskCount,
    };
  }, [projects, tasksByProject]);

  // Get project completion rates
  const projectCompletionRates = useMemo(() => {
    return projects
      .map((project) => {
        const projectTasks = tasksByProject.get(project.id) || [];
        const totalCount = projectTasks.length;
        const completedCount = projectTasks.filter(
          (task) => task.status === "done"
        ).length;
        const completionRate =
          totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        return {
          project,
          totalCount,
          completedCount,
          completionRate,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [projects, tasksByProject]);

  return {
    projects,
    allTasks,
    tasksByProject,
    taskStats,
    taskDistributionByOwner,
    projectWithMostTasks,
    projectCompletionRates,
    isLoading: isProjectsLoading || isTasksLoading || isUsersLoading,
  };
}
