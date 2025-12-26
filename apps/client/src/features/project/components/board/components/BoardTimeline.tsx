import { useState, useEffect } from "react";
import {
  Box,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  Avatar,
  Title,
  ScrollArea,
  Divider,
  Button,
  Stack,
  Timeline,
  Tooltip,
} from "@mantine/core";
import { Task } from "../../../types";
import { IUser } from "@/features/user/types/user.types";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/format-utils";
import dayjs from "dayjs";
import { IconPlus, IconCalendar } from "@tabler/icons-react";
import { Goal } from "@/features/goal/types";

interface BoardTimelineProps {
  tasks: Task[];
  users: IUser[];
  onEditTask: (task: Task) => void;
  onCreateTask?: (status?: string) => void;
  goalMap?: Record<string, Goal[]>;
}

interface TimelineGroup {
  label: string;
  date: Date | null;
  tasks: Task[];
}

export function BoardTimeline({
  tasks,
  users,
  onEditTask,
  onCreateTask,
  goalMap,
}: BoardTimelineProps) {
  const { t } = useTranslation();
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);

  // Sort tasks by date (newest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return dateA - dateB;
  });

  // Helper to map status to color
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

  // Helper to map priority to color
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

  // Group tasks by month
  const tasksByMonth: { [key: string]: Task[] } = {};
  sortedTasks.forEach((task) => {
    if (!task.dueDate) return;

    const date = new Date(task.dueDate);
    const month = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    if (!tasksByMonth[month]) {
      tasksByMonth[month] = [];
    }

    tasksByMonth[month].push(task);
  });

  // Tasks without due dates
  const tasksWithoutDueDate = sortedTasks.filter((task) => !task.dueDate);

  // Group tasks by due date
  useEffect(() => {
    const today = dayjs().startOf("day");
    const tomorrow = dayjs().add(1, "day").startOf("day");
    const nextWeek = dayjs().add(7, "day").startOf("day");

    // Initialize groups
    const groups: TimelineGroup[] = [
      { label: t("Overdue"), date: null, tasks: [] },
      { label: t("Today"), date: today.toDate(), tasks: [] },
      { label: t("Tomorrow"), date: tomorrow.toDate(), tasks: [] },
      { label: t("Next 7 Days"), date: nextWeek.toDate(), tasks: [] },
      { label: t("Later"), date: null, tasks: [] },
      { label: t("No Due Date"), date: null, tasks: [] },
    ];

    // Sort tasks into groups
    tasks.forEach((task) => {
      if (!task.dueDate) {
        groups[5].tasks.push(task);
        return;
      }

      const dueDate = dayjs(task.dueDate);

      if (dueDate.isBefore(today, "day")) {
        groups[0].tasks.push(task);
      } else if (dueDate.isSame(today, "day")) {
        groups[1].tasks.push(task);
      } else if (dueDate.isSame(tomorrow, "day")) {
        groups[2].tasks.push(task);
      } else if (dueDate.isBefore(nextWeek, "day")) {
        groups[3].tasks.push(task);
      } else {
        groups[4].tasks.push(task);
      }
    });

    // Filter out empty groups
    const filteredGroups = groups.filter((group) => group.tasks.length > 0);

    setTimelineGroups(filteredGroups);
  }, [tasks, t]);

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

  // Render task card
  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      withBorder
      p="sm"
      radius="md"
      shadow="sm"
      mb="xs"
      style={{ cursor: "pointer" }}
      onClick={() => onEditTask(task)}
    >
      <Group justify="space-between" mb="xs">
        <Badge color={getStatusColor(task.status)}>
          {task.status.replace("_", " ")}
        </Badge>
        {task.priority && (
          <Badge
            color={getPriorityColor(task.priority)}
            variant="light"
            size="sm"
          >
            {task.priority}
          </Badge>
        )}
      </Group>

      <Text fw={500} lineClamp={2} mb="xs">
        {task.title}
      </Text>

      {goalMap?.[task.id]?.length ? (
        <Group gap={6} mb="xs">
          {goalMap[task.id].slice(0, 3).map((goal) => (
            <Badge
              key={goal.id}
              size="xs"
              variant="light"
              color={getGoalColor(goal.horizon)}
            >
              {goal.name}
            </Badge>
          ))}
          {goalMap[task.id].length > 3 && (
            <Badge size="xs" variant="light" color="gray">
              {t("+{{count}}", { count: goalMap[task.id].length - 3 })}
            </Badge>
          )}
        </Group>
      ) : null}

      {task.description && (
        <Text size="sm" lineClamp={2} c="dimmed" mb="xs">
          {task.description}
        </Text>
      )}

      <Group justify="space-between" mt="md">
        {renderAssignee(task)}

        {task.dueDate && (
          <Text size="xs" c="dimmed">
            {formatDate(new Date(task.dueDate))}
          </Text>
        )}
      </Group>
    </Card>
  );

  // Render timeline group
  const renderTimelineGroup = (group: TimelineGroup, index: number) => (
    <Box key={index} mb="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>{group.label}</Title>
        <Badge variant="light" size="lg">
          {group.tasks.length} {t("tasks")}
        </Badge>
      </Group>

      <ScrollArea>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {group.tasks.map(renderTaskCard)}
        </SimpleGrid>
      </ScrollArea>

      {index < timelineGroups.length - 1 && <Divider my="md" />}
    </Box>
  );

  return (
    <Box>
      {onCreateTask && (
        <Box mb="md">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => onCreateTask()}
            size="sm"
          >
            {t("Create Task")}
          </Button>
        </Box>
      )}

      <Stack gap="xl">
        {Object.keys(tasksByMonth).map((month) => (
          <Box key={month}>
            <Text fw={700} mb="md">
              {month}
            </Text>
            <Timeline active={tasksByMonth[month].length} bulletSize={24}>
              {tasksByMonth[month].map((task) => (
                <Timeline.Item
                  key={task.id}
                  bullet={renderAssignee(task) || <span />}
                  title={
                    <Group gap="xs">
                      <Text fw={500}>{task.title}</Text>
                      <Badge color={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.priority && (
                        <Badge color={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      )}
                    </Group>
                  }
                  onClick={() => onEditTask(task)}
                  style={{ cursor: "pointer" }}
                >
                  {task.description && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {task.description}
                    </Text>
                  )}

                  {task.dueDate && (
                    <Group gap="xs" mt="xs">
                      <IconCalendar size={14} />
                      <Text size="sm">
                        {formatDate(new Date(task.dueDate))}
                      </Text>
                    </Group>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Box>
        ))}

        {tasksWithoutDueDate.length > 0 && (
          <Box>
            <Text fw={700} mb="md">
              No Due Date
            </Text>
            <Timeline active={tasksWithoutDueDate.length} bulletSize={24}>
              {tasksWithoutDueDate.map((task) => (
                <Timeline.Item
                  key={task.id}
                  bullet={renderAssignee(task) || <span />}
                  title={
                    <Group gap="xs">
                      <Text fw={500}>{task.title}</Text>
                      <Badge color={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.priority && (
                        <Badge color={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      )}
                    </Group>
                  }
                  onClick={() => onEditTask(task)}
                  style={{ cursor: "pointer" }}
                >
                  {task.description && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {task.description}
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Box>
        )}

        {Object.keys(tasksByMonth).length === 0 &&
          tasksWithoutDueDate.length === 0 && (
            <Card withBorder p="lg">
              <Text ta="center" c="dimmed">
                No tasks found
              </Text>
            </Card>
          )}
      </Stack>
    </Box>
  );
}
