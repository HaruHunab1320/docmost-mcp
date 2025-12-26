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
  useUpdateTaskMutation,
  useCompleteTaskMutation,
} from "@/features/project/hooks/use-tasks";
import { useProjects } from "@/features/project/hooks/use-projects";
import { TaskCard } from "@/features/project/components/task-card";
import { TaskDrawer } from "@/features/project/components/task-drawer";
import { projectService } from "@/features/project/services/project-service";
import { notifications } from "@mantine/notifications";
import { queryClient } from "@/main";
import { TaskBucket, TaskPriority } from "@/features/project/types";
import { ShortcutHint } from "@/features/gtd/components/shortcut-hint";
import { usePagedSpaceTasks } from "@/features/gtd/hooks/use-paged-space-tasks";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";

export function TriagePage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [includeDeferred, setIncludeDeferred] = useState(false);
  const updateTaskMutation = useUpdateTaskMutation();
  const moveTaskMutation = useMoveTaskToProjectMutation();
  const completeTaskMutation = useCompleteTaskMutation();

  const { items: tasks, isLoading, hasNextPage, loadMore } =
    usePagedSpaceTasks(spaceId || "");
  const { data: projectsData } = useProjects({ spaceId: spaceId || "" });

  const triageTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.projectId || task.isCompleted) return false;
      if (includeDeferred) return true;
      const bucket = getTaskBucket(task);
      return bucket === "none" || bucket === "inbox";
    });
  }, [includeDeferred, tasks]);

  const deferredCount = useMemo(() => {
    return tasks.filter((task) => {
      if (task.projectId || task.isCompleted) return false;
      const bucket = getTaskBucket(task);
      return bucket === "waiting" || bucket === "someday";
    }).length;
  }, [tasks]);

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

  const runBulkBucket = async (bucket: TaskBucket) => {
    if (!selectedTaskIds.length) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          projectService.updateTask({ taskId, bucket })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
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
        selectedTaskIds.map(async (taskId) => {
          await projectService.moveTaskToProject(taskId, projectId);
          await projectService.updateTask({ taskId, bucket: "none" });
        })
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
      <Stack gap="xs" mb="md">
        <Group justify="space-between">
          <Title order={2}>{t("Daily Triage")}</Title>
          <Checkbox
            label={t("Include deferred")}
            checked={includeDeferred}
            onChange={(event) =>
              setIncludeDeferred(event.currentTarget.checked)
            }
          />
        </Group>
        {!includeDeferred && deferredCount > 0 && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {t("Hidden {{count}} waiting/someday items", {
                count: deferredCount,
              })}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setIncludeDeferred(true)}
            >
              {t("Show")}
            </Button>
          </Group>
        )}
        <ShortcutHint showCapture={false} />
      </Stack>

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
                      updateTaskMutation.mutate({
                        taskId: task.id,
                        bucket: "none",
                      });
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
                  onClick={() =>
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      bucket: "waiting",
                    })
                  }
                >
                  {t("Waiting")}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() =>
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      bucket: "someday",
                    })
                  }
                >
                  {t("Someday")}
                </Button>
              </Group>
            </Box>
          ))}
          {hasNextPage && (
            <Button variant="light" onClick={loadMore}>
              {t("Load more")}
            </Button>
          )}
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
