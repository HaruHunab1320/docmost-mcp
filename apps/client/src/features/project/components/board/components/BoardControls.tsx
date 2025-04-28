import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBoardContext } from "../board-context";
import { useWorkspaceUsers } from "@/features/user/hooks/use-workspace-users";
import { IconSearch, IconFilter } from "@tabler/icons-react";

interface BoardControlsProps {
  isVisible: boolean;
}

export function BoardControls({ isVisible }: BoardControlsProps) {
  const { t } = useTranslation();
  const {
    project,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    labelFilter,
    setLabelFilter,
    searchTerm,
    setSearchTerm,
    showCompletedTasks,
    setShowCompletedTasks,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = useBoardContext();

  const { data: usersData } = useWorkspaceUsers({
    workspaceId: project.workspaceId,
  });
  const users = usersData?.items || [];

  if (!isVisible) return null;

  // Convert users to options for the MultiSelect
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.name || user.email,
  }));

  // Status options
  const statusOptions = [
    { value: "todo", label: t("To Do") },
    { value: "in_progress", label: t("In Progress") },
    { value: "in_review", label: t("In Review") },
    { value: "blocked", label: t("Blocked") },
    { value: "done", label: t("Done") },
  ];

  // Priority options
  const priorityOptions = [
    { value: "urgent", label: t("Urgent") },
    { value: "high", label: t("High") },
    { value: "medium", label: t("Medium") },
    { value: "low", label: t("Low") },
  ];

  // Extract unique labels from project tasks (would need to fetch or be provided)
  // For now, we'll use a placeholder
  const labelOptions = [
    { value: "bug", label: t("Bug") },
    { value: "feature", label: t("Feature") },
    { value: "enhancement", label: t("Enhancement") },
    { value: "documentation", label: t("Documentation") },
  ];

  // Sorting options
  const sortByOptions = [
    { value: "priority", label: t("Priority") },
    { value: "dueDate", label: t("Due Date") },
    { value: "createdAt", label: t("Created Date") },
    { value: "title", label: t("Title") },
  ];

  const sortOrderOptions = [
    { value: "asc", label: t("Ascending") },
    { value: "desc", label: t("Descending") },
  ];

  return (
    <Paper p="md" withBorder mb="md">
      <Stack>
        <Group justify="space-between">
          <Title order={4}>{t("Filters")}</Title>
        </Group>

        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={t("Search tasks...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          mb="sm"
        />

        <Group grow>
          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Status")}
            </Text>
            <MultiSelect
              data={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t("All statuses")}
              clearable
            />
          </Box>

          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Priority")}
            </Text>
            <MultiSelect
              data={priorityOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
              placeholder={t("All priorities")}
              clearable
            />
          </Box>
        </Group>

        <Group grow>
          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Assignee")}
            </Text>
            <MultiSelect
              data={userOptions}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              placeholder={t("All assignees")}
              clearable
            />
          </Box>

          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Labels")}
            </Text>
            <MultiSelect
              data={labelOptions}
              value={labelFilter}
              onChange={setLabelFilter}
              placeholder={t("All labels")}
              clearable
            />
          </Box>
        </Group>

        <Checkbox
          label={t("Show completed tasks")}
          checked={showCompletedTasks}
          onChange={(e) => setShowCompletedTasks(e.currentTarget.checked)}
          mb="xs"
        />

        <Divider my="sm" />

        <Title order={4}>{t("Sorting")}</Title>

        <Group grow>
          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Sort by")}
            </Text>
            <Select
              data={sortByOptions}
              value={sortBy}
              onChange={(value) => setSortBy(value as any)}
            />
          </Box>

          <Box>
            <Text size="sm" fw={500} mb="xs">
              {t("Order")}
            </Text>
            <Select
              data={sortOrderOptions}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as any)}
            />
          </Box>
        </Group>
      </Stack>
    </Paper>
  );
}
