import {
  Table,
  Group,
  Text,
  Badge,
  Avatar,
  Tooltip,
  ActionIcon,
  Menu,
  Box,
  Card,
  Button,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCalendar,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconTag,
  IconAlertCircle,
  IconPlus,
  IconChevronRight,
} from "@tabler/icons-react";
import { Task } from "../../../types";
import { IUser } from "@/features/user/types/user.types";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/format-utils";
import dayjs from "dayjs";
import { Goal } from "@/features/goal/types";

interface BoardListProps {
  tasks: Task[];
  users: IUser[];
  onEditTask: (task: Task) => void;
  onCreateTask?: () => void;
  goalMap?: Record<string, Goal[]>;
}

export function BoardList({
  tasks,
  users,
  onEditTask,
  onCreateTask,
  goalMap,
}: BoardListProps) {
  const { t } = useTranslation();

  // Map status to color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "blue";
      case "in_progress":
        return "yellow";
      case "blocked":
        return "red";
      case "completed":
        return "green";
      default:
        return "gray";
    }
  };

  // Map priority to color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "blue";
      default:
        return "gray";
    }
  };

  // Handle due date display
  const renderDueDate = (task: Task) => {
    if (!task.dueDate) return null;
    return (
      <Tooltip label="Due date">
        <Group gap="xs">
          <IconCalendar size={16} />
          <Text size="sm">{formatDate(new Date(task.dueDate))}</Text>
        </Group>
      </Tooltip>
    );
  };

  // Render assignee
  const renderAssignee = (task: Task) => {
    if (!task.assigneeId) return null;
    const assignee = users.find((user) => user.id === task.assigneeId);
    if (!assignee) return null;

    return (
      <Tooltip label={`Assigned to ${assignee.name}`}>
        <Avatar
          src={assignee.avatarUrl}
          alt={assignee.name}
          size="sm"
          radius="xl"
        />
      </Tooltip>
    );
  };

  // Render priority
  const renderPriority = (task: Task) => {
    if (!task.priority) return null;
    return (
      <Tooltip label={`Priority: ${task.priority}`}>
        <Badge color={getPriorityColor(task.priority)}>{task.priority}</Badge>
      </Tooltip>
    );
  };

  // Render labels
  const renderLabels = (task: Task) => {
    if (!task.labels || task.labels.length === 0) return null;
    return (
      <Group gap="xs">
        {task.labels.map((label) => (
          <Badge key={label.id} size="sm">
            {label.name}
          </Badge>
        ))}
      </Group>
    );
  };

  const getGoalColor = (horizon: string) => {
    switch (horizon) {
      case "short":
        return "teal";
      case "mid":
        return "blue";
      case "long":
        return "grape";
      default:
        return "gray";
    }
  };

  const renderGoals = (task: Task) => {
    const goals = goalMap?.[task.id] || [];
    if (goals.length === 0) return null;
    return (
      <Group gap={6}>
        {goals.slice(0, 3).map((goal) => (
          <Badge
            key={goal.id}
            size="xs"
            variant="light"
            color={getGoalColor(goal.horizon)}
          >
            {goal.name}
          </Badge>
        ))}
        {goals.length > 3 && (
          <Badge size="xs" variant="light" color="gray">
            {t("+{{count}}", { count: goals.length - 3 })}
          </Badge>
        )}
      </Group>
    );
  };

  // Render actions
  const renderActions = (task: Task) => {
    return (
      <ActionIcon size="sm" variant="transparent">
        <IconChevronRight size={16} />
      </ActionIcon>
    );
  };

  // Sort tasks by priority (high to low)
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Box>
      {onCreateTask && (
        <Box mb="md">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={onCreateTask}
            size="sm"
          >
            Create Task
          </Button>
        </Box>
      )}

      <Stack>
        {sortedTasks.map((task) => (
          <UnstyledButton
            key={task.id}
            onClick={() => onEditTask(task)}
            style={{ width: "100%" }}
          >
            <Card p="sm" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Badge color={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                  {renderActions(task)}
                </Group>

                <Text fw={500}>{task.title}</Text>
                {renderGoals(task)}
                {task.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {task.description}
                  </Text>
                )}

                <Group justify="space-between">
                  <Group gap="sm">
                    {renderAssignee(task)}
                    {renderPriority(task)}
                    {renderDueDate(task)}
                  </Group>
                  {renderLabels(task)}
                </Group>
              </Stack>
            </Card>
          </UnstyledButton>
        ))}
      </Stack>
    </Box>
  );
}
