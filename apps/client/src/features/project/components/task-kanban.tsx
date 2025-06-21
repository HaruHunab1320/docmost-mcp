import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Group,
  Paper,
  Text,
  Stack,
  Title,
  Loader,
  ScrollArea,
  Badge,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  useTasksByProject,
  useUpdateTaskMutation,
  useUpdateTaskPositionMutation,
} from "../hooks/use-tasks";
import { TaskCard } from "./task-card";
import { Task, TaskStatus } from "../types";
import { IconPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import TaskFormModal from "./task-form-modal";

interface TaskKanbanProps {
  projectId: string;
  spaceId: string;
  onTaskClick: (taskId: string) => void;
}

// Define the columns for the kanban board
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
  { id: "blocked", label: "Blocked" },
];

export function TaskKanban({
  projectId,
  spaceId,
  onTaskClick,
}: TaskKanbanProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [opened, { open, close }] = useDisclosure(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Fetch tasks for the project
  const {
    data: taskData,
    isLoading,
    refetch,
  } = useTasksByProject({
    projectId,
  });

  // Update task mutations
  const updateTaskMutation = useUpdateTaskMutation();
  const updateTaskPositionMutation = useUpdateTaskPositionMutation();

  // Refetch tasks when mutations complete
  useEffect(() => {
    if (updateTaskMutation.isSuccess || updateTaskPositionMutation.isSuccess) {
      refetch();
    }
  }, [
    updateTaskMutation.isSuccess,
    updateTaskPositionMutation.isSuccess,
    refetch,
  ]);

  // Group tasks by status
  const getTasksByStatus = (status: TaskStatus) => {
    if (!taskData || !taskData.items) return [];

    // Sort by position if available, then by creation date
    return taskData.items
      .filter((task) => task.status === status)
      .sort((a, b) => {
        if (a.position && b.position) {
          return a.position.localeCompare(b.position);
        }
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
  };

  // Handle drag start
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Handle drag over a task
  const handleDragOverTask = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTaskId(taskId);
  };

  // Handle drop
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetStatus: TaskStatus
  ) => {
    e.preventDefault();

    if (draggedTask && draggedTask.status !== targetStatus) {
      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        status: targetStatus,
      });
    }

    setDraggedTask(null);
    setDragOverTaskId(null);
  };

  // Handle drop on a task (for reordering)
  const handleDropOnTask = (
    e: React.DragEvent<HTMLDivElement>,
    targetTask: Task
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTask) return;

    if (draggedTask.id !== targetTask.id) {
      // If status is different, update status first
      if (draggedTask.status !== targetTask.status) {
        updateTaskMutation.mutate({
          taskId: draggedTask.id,
          status: targetTask.status,
        });
      }

      // Generate a position value between tasks
      const columnTasks = getTasksByStatus(targetTask.status);
      const positionValue = generatePositionBetween(
        columnTasks,
        draggedTask.id,
        targetTask.id
      );

      if (positionValue) {
        // Update the task position
        updateTaskPositionMutation.mutate({
          taskId: draggedTask.id,
          position: positionValue,
          projectId: projectId,
          spaceId: spaceId,
        });
      }
    }

    setDraggedTask(null);
    setDragOverTaskId(null);
  };

  // Generate a position string between two tasks
  const generatePositionBetween = (
    tasksInColumn: Task[],
    activeTaskId: string,
    targetTaskId: string
  ): string | null => {
    // Find the indices of the tasks in the sorted array
    const sortedTasks = tasksInColumn.map((t) => ({
      id: t.id,
      position: t.position || "",
    }));
    const targetIndex = sortedTasks.findIndex((t) => t.id === targetTaskId);

    if (targetIndex === -1) return null;

    // Determine if we're moving before or after the target
    let beforePosition: string | undefined;
    let afterPosition: string | undefined;

    if (targetIndex === 0) {
      // Moving to the start of the list
      afterPosition = sortedTasks[0].position;
      beforePosition = "";
    } else if (targetIndex === sortedTasks.length - 1) {
      // Moving to the end of the list
      beforePosition = sortedTasks[targetIndex].position;
      afterPosition = "";
    } else {
      // Moving between two items
      beforePosition = sortedTasks[targetIndex - 1].position;
      afterPosition = sortedTasks[targetIndex].position;
    }

    // Generate a position string between the two positions
    if (!beforePosition) beforePosition = "";
    if (!afterPosition) afterPosition = "z".repeat(10);

    const length = Math.max(beforePosition.length, afterPosition.length);
    const beforeVal = beforePosition.padEnd(length, "0");
    const afterVal = afterPosition.padEnd(length, "z");

    // Find a position string between the two values
    let midPosition = "";
    for (let i = 0; i < length; i++) {
      const beforeChar = beforeVal.charCodeAt(i) || 48; // '0' is 48
      const afterChar = afterVal.charCodeAt(i) || 122; // 'z' is 122

      if (beforeChar === afterChar) {
        midPosition += String.fromCharCode(beforeChar);
        continue;
      }

      // Find the middle value between the two characters
      const midChar = Math.floor((beforeChar + afterChar) / 2);
      midPosition += String.fromCharCode(midChar);
      break;
    }

    return midPosition || beforePosition + "m";
  };

  // Helper functions for UI color
  const getColumnColor = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0];
      case "in_progress":
        return colorScheme === "dark"
          ? theme.colors.blue[9]
          : theme.colors.blue[0];
      case "in_review":
        return colorScheme === "dark"
          ? theme.colors.indigo[9]
          : theme.colors.indigo[0];
      case "done":
        return colorScheme === "dark"
          ? theme.colors.green[9]
          : theme.colors.green[0];
      case "blocked":
        return colorScheme === "dark"
          ? theme.colors.red[9]
          : theme.colors.red[0];
      default:
        return colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0];
    }
  };

  const getBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return "gray";
      case "in_progress":
        return "blue";
      case "in_review":
        return "indigo";
      case "done":
        return "green";
      case "blocked":
        return "red";
      default:
        return "gray";
    }
  };

  if (isLoading) {
    return (
      <Box
        style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
      >
        <Loader />
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="flex-end" mb="md">
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          {t("New Task")}
        </Button>
      </Group>

      <ScrollArea h={600} type="auto" offsetScrollbars>
        <Group align="flex-start" style={{ minWidth: COLUMNS.length * 280 }}>
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id);

            return (
              <Paper
                key={column.id}
                shadow="xs"
                p="md"
                w={280}
                h="100%"
                withBorder
                style={{
                  backgroundColor: getColumnColor(column.id),
                  transition: "background-color 0.2s",
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={5}>{t(column.label)}</Title>
                    <Badge variant="light" color={getBadgeColor(column.id)}>
                      {columnTasks.length}
                    </Badge>
                  </Group>

                  {columnTasks.length === 0 ? (
                    <Box
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        border: "1px dashed var(--mantine-color-gray-4)",
                        borderRadius: "var(--mantine-radius-sm)",
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      <Text size="sm" c="dimmed">
                        {t("Drop tasks here")}
                      </Text>
                    </Box>
                  ) : (
                    <Stack gap="md">
                      {columnTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onDragOver={(e) => handleDragOverTask(e, task.id)}
                          onDrop={(e) => handleDropOnTask(e, task)}
                          style={{
                            opacity: draggedTask?.id === task.id ? 0.5 : 1,
                            borderTop:
                              dragOverTaskId === task.id
                                ? "2px solid blue"
                                : "none",
                          }}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => onTaskClick(task.id)}
                            isDragging={draggedTask?.id === task.id}
                          />
                        </div>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Group>
      </ScrollArea>

      <TaskFormModal
        opened={opened}
        onClose={close}
        projectId={projectId}
        spaceId={spaceId}
        task={null}
      />
    </Box>
  );
}
