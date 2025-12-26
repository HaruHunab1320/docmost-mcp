import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Group,
  Stack,
  TextInput,
  ActionIcon,
  Text,
  Loader,
  Select,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TaskStatus } from "../types";
import { useTasksByProject, useCreateTaskMutation } from "../hooks/use-tasks";
import { TaskCard } from "./task-card";
import { IconFilter, IconPlus, IconSearch } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import TaskFormModal from "./task-form-modal";
import { useQuery } from "@tanstack/react-query";
import { listGoalsForTasks } from "@/features/goal/services/goal-service";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { Goal } from "@/features/goal/types";

interface TaskListProps {
  projectId: string;
  spaceId: string;
  onTaskClick: (taskId: string) => void;
}

export function TaskList({ projectId, spaceId, onTaskClick }: TaskListProps) {
  const { t } = useTranslation();
  const [workspace] = useAtom(workspaceAtom);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [opened, { open, close }] = useDisclosure(false);

  // Fetch tasks for the project
  const {
    data: taskData,
    isLoading,
    refetch,
  } = useTasksByProject({
    projectId,
    searchTerm: searchTerm || undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
  });
  const taskIds = taskData?.items.map((task) => task.id) || [];
  const goalsQuery = useQuery({
    queryKey: ["task-goals", projectId, workspace?.id, taskIds],
    queryFn: () =>
      listGoalsForTasks({
        workspaceId: workspace?.id || "",
        taskIds,
      }),
    enabled: !!workspace?.id && taskIds.length > 0,
  });
  const goalMap = useMemo(() => {
    const map: Record<string, Goal[]> = {};
    (goalsQuery.data || []).forEach((goal) => {
      if (!map[goal.taskId]) {
        map[goal.taskId] = [];
      }
      map[goal.taskId].push(goal);
    });
    return map;
  }, [goalsQuery.data]);

  // Create task mutation
  const createTaskMutation = useCreateTaskMutation();

  // Refetch tasks when mutations complete
  useEffect(() => {
    if (createTaskMutation.isSuccess) {
      refetch();
    }
  }, [createTaskMutation.isSuccess, refetch]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (value: string[]) => {
    setStatusFilter(value as TaskStatus[]);
  };

  // Filter options
  const statusOptions = [
    { value: "todo", label: t("To Do") },
    { value: "in_progress", label: t("In Progress") },
    { value: "in_review", label: t("In Review") },
    { value: "done", label: t("Done") },
    { value: "blocked", label: t("Blocked") },
  ];

  return (
    <Box>
      {/* Controls */}
      <Group justify="space-between" mb="md">
        <Group>
          <TextInput
            placeholder={t("Search tasks...")}
            value={searchTerm}
            onChange={handleSearchChange}
            leftSection={<IconSearch size={16} />}
          />

          <Select
            placeholder={t("Filter by status")}
            data={statusOptions}
            value={statusFilter.length > 0 ? statusFilter[0] : null}
            onChange={(value) => {
              if (value) {
                setStatusFilter([value as TaskStatus]);
              } else {
                setStatusFilter([]);
              }
            }}
            clearable
            leftSection={<IconFilter size={16} />}
          />
        </Group>

        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          {t("New Task")}
        </Button>
      </Group>

      {/* Task list */}
      {isLoading ? (
        <Box
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Loader />
        </Box>
      ) : !taskData || taskData.items.length === 0 ? (
        <Box
          style={{
            textAlign: "center",
            padding: "2rem",
            border: "1px dashed var(--mantine-color-gray-4)",
            borderRadius: "var(--mantine-radius-md)",
          }}
        >
          <Text size="lg" fw={500} mb="sm">
            {t("No tasks found")}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {t("Create a new task to get started")}
          </Text>
          <Button variant="light" onClick={open}>
            {t("Create Task")}
          </Button>
        </Box>
      ) : (
        <Stack gap="md">
          {taskData.items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              goalMap={goalMap}
            />
          ))}
        </Stack>
      )}

      {/* Task form modal */}
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
