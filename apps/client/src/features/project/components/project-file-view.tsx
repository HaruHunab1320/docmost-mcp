import { useState } from "react";
import {
  Box,
  Group,
  Title,
  Text,
  Stack,
  Paper,
  Divider,
  Button,
  Flex,
  Badge,
  ActionIcon,
  Card,
  LoadingOverlay,
  Modal,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { useProject } from "../hooks/use-projects";
import {
  CreateTaskParams,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from "../types";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectFileSidebar } from "./project-file-sidebar";
import { useTask, useCreateTaskMutation } from "../hooks/use-tasks";
import { formatDate } from "@/lib/utils/format-utils";
import { useForm } from "@mantine/form";

interface ProjectFileViewProps {
  projectId: string;
  spaceId: string;
  onBack?: () => void;
}

export function ProjectFileView({
  projectId,
  spaceId,
  onBack,
}: ProjectFileViewProps) {
  const { t } = useTranslation();
  const { data: project, isLoading } = useProject(projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: selectedTask } = useTask(selectedTaskId || "");
  const [
    createTaskModalOpened,
    { open: openCreateTaskModal, close: closeCreateTaskModal },
  ] = useDisclosure(false);
  const createTaskMutation = useCreateTaskMutation();
  const navigate = useNavigate();

  const form = useForm<CreateTaskParams>({
    initialValues: {
      title: "",
      description: "",
      status: "todo" as TaskStatus,
      priority: "medium" as TaskPriority,
      projectId,
      spaceId,
    },
    validate: {
      title: (value) =>
        value.trim().length < 1 ? t("Title is required") : null,
    },
  });

  const handleCreateTask = (values: CreateTaskParams) => {
    createTaskMutation.mutate(values, {
      onSuccess: (newTask) => {
        notifications.show({
          title: t("Task created"),
          message: t('Task "{title}" has been created', {
            title: values.title,
          }),
          color: "green",
        });
        closeCreateTaskModal();
        form.reset();
        setSelectedTaskId(newTask.id);
      },
    });
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleOpenCreateTaskModal = () => {
    form.reset();
    form.setFieldValue("projectId", projectId);
    form.setFieldValue("spaceId", spaceId);
    openCreateTaskModal();
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/s/${spaceId}`);
    }
  };

  if (isLoading) {
    return (
      <Box pos="relative" h="100%">
        <LoadingOverlay visible />
      </Box>
    );
  }

  if (!project) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text>{t("Project not found")}</Text>
        <Button onClick={handleGoBack}>{t("Go back")}</Button>
      </Stack>
    );
  }

  return (
    <>
      <Flex h="calc(100vh - 60px)">
        {/* Left Sidebar */}
        <Box w={260} h="100%">
          <ProjectFileSidebar
            projectId={projectId}
            spaceId={spaceId}
            onSelectTask={handleTaskSelect}
          />
        </Box>

        {/* Main Content */}
        <Box flex={1} p="md" h="100%" style={{ overflowY: "auto" }}>
          {selectedTask ? (
            <Stack gap="md">
              <Group justify="space-between">
                <Group>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setSelectedTaskId(null)}
                  >
                    <IconArrowLeft size={18} />
                  </ActionIcon>
                  <Title order={2}>{selectedTask.title}</Title>
                  <Badge
                    color={
                      selectedTask.status === "done"
                        ? "green"
                        : selectedTask.status === "in_progress"
                          ? "blue"
                          : selectedTask.status === "blocked"
                            ? "red"
                            : "gray"
                    }
                  >
                    {selectedTask.status}
                  </Badge>
                </Group>
                <Button leftSection={<IconEdit size={16} />} variant="subtle">
                  {t("Edit")}
                </Button>
              </Group>

              <Paper p="md" withBorder>
                <Stack gap="md">
                  {selectedTask.description && (
                    <>
                      <Text fw={500}>{t("Description")}</Text>
                      <Text>{selectedTask.description}</Text>
                      <Divider />
                    </>
                  )}

                  <Group justify="space-between">
                    <Group>
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          {t("Priority")}
                        </Text>
                        <Badge
                          color={
                            selectedTask.priority === "urgent"
                              ? "red"
                              : selectedTask.priority === "high"
                                ? "orange"
                                : selectedTask.priority === "medium"
                                  ? "yellow"
                                  : "blue"
                          }
                        >
                          {selectedTask.priority}
                        </Badge>
                      </Stack>

                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          {t("Status")}
                        </Text>
                        <Badge
                          color={
                            selectedTask.status === "done"
                              ? "green"
                              : selectedTask.status === "in_progress"
                                ? "blue"
                                : selectedTask.status === "blocked"
                                  ? "red"
                                  : "gray"
                          }
                        >
                          {selectedTask.status}
                        </Badge>
                      </Stack>
                    </Group>

                    <Group>
                      {selectedTask.dueDate && (
                        <Stack gap={4}>
                          <Text size="sm" c="dimmed">
                            {t("Due Date")}
                          </Text>
                          <Text>
                            {formatDate(new Date(selectedTask.dueDate))}
                          </Text>
                        </Stack>
                      )}

                      {selectedTask.assignee && (
                        <Stack gap={4}>
                          <Text size="sm" c="dimmed">
                            {t("Assignee")}
                          </Text>
                          <Text>{selectedTask.assignee.name}</Text>
                        </Stack>
                      )}
                    </Group>
                  </Group>
                </Stack>
              </Paper>

              {/* Subtasks section - this would use the ProjectTree component to show just the subtasks */}
              <Card withBorder>
                <Card.Section withBorder inheritPadding py="xs">
                  <Group justify="space-between">
                    <Title order={4}>{t("Subtasks")}</Title>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                    >
                      {t("Add subtask")}
                    </Button>
                  </Group>
                </Card.Section>
                <Card.Section p="md">
                  {/* Subtasks would go here */}
                  <Text c="dimmed">{t("No subtasks found")}</Text>
                </Card.Section>
              </Card>
            </Stack>
          ) : (
            <Box
              h="100%"
              display="flex"
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Stack align="center" gap="md">
                <Text size="xl" fw={500}>
                  {t("Select a task to view details")}
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleOpenCreateTaskModal}
                >
                  {t("Create new task")}
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      </Flex>

      {/* Create Task Modal */}
      <Modal
        opened={createTaskModalOpened}
        onClose={closeCreateTaskModal}
        title={t("Create new task")}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleCreateTask)}>
          <TextInput
            label={t("Title")}
            placeholder={t("Enter task title")}
            required
            mb="md"
            {...form.getInputProps("title")}
          />
          <Textarea
            label={t("Description")}
            placeholder={t("Enter task description")}
            minRows={3}
            mb="md"
            {...form.getInputProps("description")}
          />
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={closeCreateTaskModal}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              leftSection={<IconCheck size={14} />}
              loading={createTaskMutation.isPending}
            >
              {t("Create task")}
            </Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
