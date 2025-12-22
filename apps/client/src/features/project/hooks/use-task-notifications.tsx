import React, { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectService } from "../services/project-service";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconAlarm } from "@tabler/icons-react";
import { useInterval } from "@mantine/hooks";
import { Task } from "../types";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";
import useCurrentUser from "@/features/user/hooks/use-current-user";
import { useCurrentSpace } from "@/features/space/hooks/use-current-space";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";

// Initialize dayjs plugins
dayjs.extend(calendar);
dayjs.extend(relativeTime);

interface UseTaskNotificationsParams {
  userId: string;
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
}

// Custom hook to get tasks assigned to a specific user
function useTasksByAssignee(userId: string, enabled: boolean = true) {
  const { data: workspace } = useCurrentWorkspace();
  const { data: space } = useCurrentSpace();

  return useQuery({
    queryKey: ["tasks-by-assignee", userId],
    queryFn: async () => {
      if (!space?.id) return null;

      const response = await projectService.listTasksBySpace({
        spaceId: space.id,
      });

      // Filter to only include tasks assigned to the specified user
      if (response && response.items) {
        const filteredItems = response.items.filter(
          (task) => task.assigneeId === userId
        );
        return {
          ...response,
          items: filteredItems,
        };
      }

      return response;
    },
    enabled: !!userId && !!workspace?.id && !!space?.id && enabled,
  });
}

export function useTaskNotifications({
  userId,
  enabled = true,
  checkInterval = 1800000, // Default: check every 30 minutes
}: UseTaskNotificationsParams) {
  const { t } = useTranslation();
  const { data: workspace } = useCurrentWorkspace();
  const currentUser = useCurrentUser();
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<string>>(new Set());

  // Get tasks assigned to the current user
  const { data: tasksData, isLoading } = useTasksByAssignee(userId, enabled);

  const checkForTaskNotifications = useCallback(() => {
    if (!tasksData?.items?.length || !enabled) return;
    
    const today = dayjs();
    const upcomingTasks = tasksData.items.filter((task: Task) => {
      if (!task.dueDate || task.status === "done") return false;
      
      const dueDate = dayjs(task.dueDate);
      const diffInDays = dueDate.diff(today, "day");
      
      // Due within the next 24 hours but not overdue
      return diffInDays >= 0 && diffInDays <= 1;
    });
    
    const overdueTasks = tasksData.items.filter((task: Task) => {
      if (!task.dueDate || task.status === "done") return false;
      
      const dueDate = dayjs(task.dueDate);
      return dueDate.isBefore(today, "day");
    });
    
    // Notify for upcoming tasks
    upcomingTasks.forEach((task: Task) => {
      if (notifiedTaskIds.has(`upcoming-${task.id}`)) return;
      
      notifications.show({
        id: `task-due-soon-${task.id}`,
        title: t("Task Due Soon"),
        message: t('"{title}" is due {time}', {
          title: task.title,
          time: dayjs(task.dueDate).calendar()
        }),
        color: "yellow",
        icon: <IconAlarm />,
        autoClose: 10000,
      });
      
      setNotifiedTaskIds(prev => new Set([...prev, `upcoming-${task.id}`]));
    });
    
    // Notify for overdue tasks
    overdueTasks.forEach((task: Task) => {
      if (notifiedTaskIds.has(`overdue-${task.id}`)) return;
      
      notifications.show({
        id: `task-overdue-${task.id}`,
        title: t("Task Overdue"),
        message: t('"{title}" was due {time}', { 
          title: task.title,
          time: dayjs(task.dueDate).fromNow()
        }),
        color: "red",
        icon: <IconAlarm />,
        autoClose: 10000,
      });
      
      setNotifiedTaskIds(prev => new Set([...prev, `overdue-${task.id}`]));
    });
  }, [tasksData, notifiedTaskIds, t, enabled]);
  
  // Use interval to periodically check for notifications
  const interval = useInterval(checkForTaskNotifications, checkInterval);

  // Initial check when tasks data loads
  useEffect(() => {
    if (!isLoading && tasksData) {
      checkForTaskNotifications();
    }
  }, [tasksData, isLoading, checkForTaskNotifications]);

  // Start interval check
  useEffect(() => {
    if (enabled) {
      interval.start();
    } else {
      interval.stop();
    }

    return interval.stop;
  }, [enabled, interval]);

  return {
    checkForNotifications: checkForTaskNotifications,
  };
}
