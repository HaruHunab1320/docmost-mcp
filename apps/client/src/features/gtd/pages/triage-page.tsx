import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useMoveTaskToProjectMutation,
  useTasksBySpace,
  useUpdateTaskMutation,
  useCompleteTaskMutation,
} from "@/features/project/hooks/use-tasks";
import { useProjects } from "@/features/project/hooks/use-projects";
import { TaskCard } from "@/features/project/components/task-card";
import { TaskDrawer } from "@/features/project/components/task-drawer";
import { projectService } from "@/features/project/services/project-service";
import { notifications } from "@mantine/notifications";
import { queryClient } from "@/main";
import { TaskPriority } from "@/features/project/types";
import {
  clearTaskBucket,
  setTaskBucket,
} from "@/features/gtd/utils/task-buckets";

export function TriagePage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const updateTaskMutation = useUpdateTaskMutation();
  const moveTaskMutation = useMoveTaskToProjectMutation();
  const completeTaskMutation = useCompleteTaskMutation();

  const { data: tasksData, isLoading } = useTasksBySpace({
    spaceId: spaceId || "",
    page: 1,
    limit: 200,
  });
  const { data: projectsData } = useProjects({ spaceId: spaceId || "" });

  const triageTasks = useMemo(() => {
    return (tasksData?.items || []).filter(
      (task) => !task.projectId && !task.isCompleted
    );
  }, [tasksData?.items]);

  const toggleSelected = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === triageTasks.length) {
      setSelectedTaskIds([]);
      return;
    }
    setSelectedTaskIds(triageTasks.map((task) => task.id));
  };

  const runBulkUpdate = async (updates: {
    dueDate?: Date;
    priority?: TaskPriority;
  }) => {
    if (!selectedTaskIds.length) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          projectService.updateTask({ taskId, ...updates })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
      notifications.show({
        title: t("Updated"),
        message: t("Updated {{count}} tasks", {
          count: selectedTaskIds.length,
        }),
        color: "green",
      });
      setSelectedTaskIds([]);
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Bulk update failed"),
        color: "red",
      });
    } finally {
      setBulkWorking(false);
    }
  };

  const runBulkComplete = async () => {
    if (!selectedTaskIds.length) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          projectService.completeTask(taskId, true)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
      notifications.show({
        title: t("Completed"),
        message: t("Completed {{count}} tasks", {
          count: selectedTaskIds.length,
        }),
        color: "green",
      });
      setSelectedTaskIds([]);
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Bulk complete failed"),
        color: "red",
      });
    } finally {
      setBulkWorking(false);
    }
  };

  const runBulkBucket = async (bucket: "waiting" | "someday") => {
    if (!selectedTaskIds.length || !spaceId) return;
    setBulkWorking(true);
    try {
      selectedTaskIds.forEach((taskId) =>
        setTaskBucket(spaceId, taskId, bucket)
      );
      notifications.show({
        title: t("Bucketed"),
        message: t("Moved {{count}} tasks", {
          count: selectedTaskIds.length,
        }),
        color: "green",
      });
      setSelectedTaskIds([]);
    } finally {
      setBulkWorking(false);
    }
  };

  const runBulkAssign = async (projectId: string) => {
    if (!selectedTaskIds.length) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          projectService.moveTaskToProject(taskId, projectId)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      notifications.show({
        title: t("Assigned"),
        message: t("Assigned {{count}} tasks", {
          count: selectedTaskIds.length,
        }),
        color: "green",
      });
      setSelectedTaskIds([]);
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Bulk assignment failed"),
        color: "red",
      });
    } finally {
      setBulkWorking(false);
    }
  };

  const projectOptions = useMemo(() => {
    const projects = Array.isArray(projectsData?.items)
      ? projectsData?.items
      : Array.isArray(projectsData?.data)
        ? projectsData?.data
        : [];

    return projects.map((project) => ({
      value: project.id,
      label: project.name,
    }));
  }, [projectsData]);

  if (!spaceId) {
    return (
      <Container size="md" py="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group mb="md" justify="space-between">
        <Title order={2}>{t("Daily Triage")}</Title>
      </Group>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading triage queue...")}
        </Text>
      ) : triageTasks.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("Nothing to triage")}
        </Text>
      ) : (
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <Checkbox
                checked={
                  triageTasks.length > 0 &&
                  selectedTaskIds.length === triageTasks.length
                }
                indeterminate={
                  selectedTaskIds.length > 0 &&
                  selectedTaskIds.length < triageTasks.length
                }
                onChange={toggleSelectAll}
              />
              <Text size="sm" c="dimmed">
                {t("Selected {{count}}", { count: selectedTaskIds.length })}
              </Text>
            </Group>

            <Group>
              <Select
                placeholder={t("Bulk assign to project")}
                data={projectOptions}
                onChange={(value) => value && runBulkAssign(value)}
                searchable
                clearable
                disabled={!selectedTaskIds.length}
              />
              <Button
                variant="light"
                onClick={() => runBulkUpdate({ dueDate: new Date() })}
                disabled={!selectedTaskIds.length}
                loading={bulkWorking}
              >
                {t("Do today")}
              </Button>
              <Button
                variant="light"
                onClick={() => runBulkUpdate({ priority: "medium" })}
                disabled={!selectedTaskIds.length}
                loading={bulkWorking}
              >
                {t("Next")}
              </Button>
              <Button
                variant="subtle"
                onClick={runBulkComplete}
                disabled={!selectedTaskIds.length}
                loading={bulkWorking}
              >
                {t("Complete")}
              </Button>
              <Button
                variant="subtle"
                onClick={() => runBulkBucket("waiting")}
                disabled={!selectedTaskIds.length}
                loading={bulkWorking}
              >
                {t("Waiting")}
              </Button>
              <Button
                variant="subtle"
                onClick={() => runBulkBucket("someday")}
                disabled={!selectedTaskIds.length}
                loading={bulkWorking}
              >
                {t("Someday")}
              </Button>
            </Group>
          </Group>

          {triageTasks.map((task) => (
            <Box key={task.id}>
              <Group align="flex-start" wrap="nowrap">
                <Checkbox
                  mt={6}
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => toggleSelected(task.id)}
                />
                <Box style={{ flex: 1 }}>
                  <TaskCard
                    task={task}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setDrawerOpened(true);
                    }}
                  />
                </Box>
              </Group>

              <Group mt="xs" gap="sm">
                <Select
                  placeholder={t("Assign to project")}
                  data={projectOptions}
                  onChange={(value) => {
                    if (value) {
                      moveTaskMutation.mutate({
                        taskId: task.id,
                        projectId: value,
                      });
                      clearTaskBucket(spaceId, task.id);
                    }
                  }}
                  searchable
                  clearable
                />
                <Button
                  variant="light"
                  onClick={() =>
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      dueDate: new Date(),
                    })
                  }
                >
                  {t("Do today")}
                </Button>
                <Button
                  variant="light"
                  onClick={() =>
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      priority: "medium",
                    })
                  }
                >
                  {t("Next")}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() =>
                    completeTaskMutation.mutate({
                      taskId: task.id,
                      isCompleted: true,
                    })
                  }
                >
                  {t("Complete")}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setTaskBucket(spaceId, task.id, "waiting")}
                >
                  {t("Waiting")}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setTaskBucket(spaceId, task.id, "someday")}
                >
                  {t("Someday")}
                </Button>
              </Group>
            </Box>
          ))}
        </Stack>
      )}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          spaceId={spaceId}
        />
      )}
    </Container>
  );
}
