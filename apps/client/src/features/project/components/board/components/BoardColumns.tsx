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
  Button,
  Stack,
  Checkbox,
  Title,
  Select,
  MultiSelect,
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
  IconTable,
  IconTableOptions,
  IconCheckbox,
  IconSettings,
} from "@tabler/icons-react";
import { Task } from "../../../types";
import { IUser } from "@/features/user/types/user.types";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/format-utils";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { Goal } from "@/features/goal/types";

interface BoardColumnsProps {
  tasks: Task[];
  users: IUser[];
  onEditTask: (task: Task) => void;
  onCreateTask?: () => void;
  goalMap?: Record<string, Goal[]>;
}

// Column definition type
interface ColumnDefinition {
  id: string;
  label: string;
  visible: boolean;
  width?: string;
  renderCell: (task: Task) => React.ReactNode;
}

export function BoardColumns({
  tasks,
  users,
  onEditTask,
  onCreateTask,
  goalMap,
}: BoardColumnsProps) {
  const { t } = useTranslation();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "title",
    "status",
    "priority",
    "goals",
    "assignee",
    "dueDate",
  ]);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);

  // Helper functions for rendering cell content
  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "blue";
      case "in_progress":
        return "yellow";
      case "in_review":
        return "grape";
      case "done":
        return "green";
      case "blocked":
        return "red";
      default:
        return "gray";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "blue";
      case "medium":
        return "yellow";
      case "high":
        return "orange";
      case "urgent":
        return "red";
      default:
        return "gray";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <IconAlertCircle size={14} />;
    }
    return null;
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

  const renderAssignee = (task: Task) => {
    if (!task.assigneeId) return <Text size="sm">—</Text>;

    const assignee = users.find((user) => user.id === task.assigneeId);
    if (!assignee) return <Text size="sm">—</Text>;

    return (
      <Group gap="xs">
        <Avatar
          src={assignee.avatarUrl}
          size="sm"
          radius="xl"
          alt={assignee.name || ""}
        />
        <Text size="sm">{assignee.name}</Text>
      </Group>
    );
  };

  const renderDueDate = (task: Task) => {
    if (!task.dueDate) return <Text size="sm">—</Text>;

    const date = dayjs(task.dueDate);
    const isPastDue = date.isBefore(dayjs(), "day");

    return (
      <Text size="sm" c={isPastDue ? "red" : undefined}>
        {formatDate(task.dueDate)}
      </Text>
    );
  };

  // Column definitions
  const allColumns: ColumnDefinition[] = [
    {
      id: "title",
      label: t("Title"),
      visible: true,
      width: "30%",
      renderCell: (task) => (
        <Box>
          <Text fw={500}>{task.title}</Text>
          {task.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {task.description}
            </Text>
          )}
        </Box>
      ),
    },
    {
      id: "status",
      label: t("Status"),
      visible: true,
      width: "10%",
      renderCell: (task) => (
        <Badge color={getStatusColor(task.status)}>
          {t(task.status.replace("_", " "))}
        </Badge>
      ),
    },
    {
      id: "priority",
      label: t("Priority"),
      visible: true,
      width: "10%",
      renderCell: (task) => (
        <Group gap="xs">
          {getPriorityIcon(task.priority)}
          <Badge color={getPriorityColor(task.priority)}>
            {t(task.priority)}
          </Badge>
        </Group>
      ),
    },
    {
      id: "goals",
      label: t("Goals"),
      visible: true,
      width: "15%",
      renderCell: (task) => {
        const goals = goalMap?.[task.id] || [];
        if (goals.length === 0) return <Text size="sm">—</Text>;
        return (
          <Group gap={6}>
            {goals.slice(0, 2).map((goal) => (
              <Badge
                key={goal.id}
                size="xs"
                variant="light"
                color={getGoalColor(goal.horizon)}
              >
                {goal.name}
              </Badge>
            ))}
            {goals.length > 2 && (
              <Badge size="xs" variant="light" color="gray">
                {t("+{{count}}", { count: goals.length - 2 })}
              </Badge>
            )}
          </Group>
        );
      },
    },
    {
      id: "assignee",
      label: t("Assignee"),
      visible: true,
      width: "15%",
      renderCell: renderAssignee,
    },
    {
      id: "dueDate",
      label: t("Due Date"),
      visible: true,
      width: "15%",
      renderCell: renderDueDate,
    },
    {
      id: "project",
      label: t("Project"),
      visible: false,
      width: "15%",
      renderCell: (task) => {
        if (!task.projectId) return <Text size="sm">—</Text>;
        return <Text size="sm">{task.projectId}</Text>;
      },
    },
    {
      id: "isCompleted",
      label: t("Completed"),
      visible: false,
      width: "10%",
      renderCell: (task) => (
        <Badge color={task.isCompleted ? "green" : "gray"}>
          {task.isCompleted ? t("Yes") : t("No")}
        </Badge>
      ),
    },
  ];

  // Update column visibility based on user selection
  useEffect(() => {
    allColumns.forEach((column) => {
      column.visible = visibleColumns.includes(column.id);
    });
  }, [visibleColumns]);

  const currentColumns = allColumns.filter((col) =>
    visibleColumns.includes(col.id)
  );

  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort completed tasks to the bottom
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }

    // Sort by priority (high to low)
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    // Put tasks with due dates first
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={4}>{t("Tasks")}</Title>

        <Group>
          <Menu
            opened={isColumnsMenuOpen}
            onChange={setIsColumnsMenuOpen}
            closeOnItemClick={false}
            position="bottom-end"
            withinPortal
          >
            <Menu.Target>
              <Button
                variant="subtle"
                leftSection={<IconTable size={16} />}
                size="sm"
              >
                {t("Columns")}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t("Select visible columns")}</Menu.Label>

              {allColumns.map((column) => (
                <Menu.Item
                  key={column.id}
                  leftSection={
                    <Checkbox
                      checked={visibleColumns.includes(column.id)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          setVisibleColumns([...visibleColumns, column.id]);
                        } else {
                          // Prevent deselecting all columns
                          if (visibleColumns.length > 1) {
                            setVisibleColumns(
                              visibleColumns.filter((id) => id !== column.id)
                            );
                          }
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  onClick={() => {
                    // Toggle the checkbox when the menu item is clicked
                    if (visibleColumns.includes(column.id)) {
                      // Prevent deselecting all columns
                      if (visibleColumns.length > 1) {
                        setVisibleColumns(
                          visibleColumns.filter((id) => id !== column.id)
                        );
                      }
                    } else {
                      setVisibleColumns([...visibleColumns, column.id]);
                    }
                  }}
                >
                  {column.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {onCreateTask && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={onCreateTask}
              size="sm"
            >
              {t("Create Task")}
            </Button>
          )}
        </Group>
      </Group>

      <Table striped highlightOnHover withColumnBorders withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {/* Checkbox column for selecting tasks */}
            <Table.Th style={{ width: "40px" }}>
              <Checkbox />
            </Table.Th>

            {/* Dynamic columns based on user selection */}
            {currentColumns.map((column) => (
              <Table.Th key={column.id} style={{ width: column.width }}>
                {column.label}
              </Table.Th>
            ))}

            {/* Actions column */}
            <Table.Th style={{ width: "60px" }}>{t("Actions")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedTasks.length === 0 ? (
            <Table.Tr>
              <Table.Td
                colSpan={currentColumns.length + 2}
                align="center"
                py="lg"
              >
                <Stack align="center" gap="sm">
                  <Text fw={500}>{t("No tasks found")}</Text>
                  {onCreateTask && (
                    <Button onClick={onCreateTask} size="sm">
                      {t("Create Task")}
                    </Button>
                  )}
                </Stack>
              </Table.Td>
            </Table.Tr>
          ) : (
            sortedTasks.map((task) => (
              <Table.Tr
                key={task.id}
                style={{
                  cursor: "pointer",
                  opacity: task.isCompleted ? 0.7 : 1,
                  textDecoration: task.isCompleted ? "line-through" : "none",
                }}
                onClick={() => onEditTask(task)}
              >
                {/* Checkbox column */}
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.isCompleted}
                    onChange={(e) => {
                      // Handle task completion change
                      console.log(
                        "Task completion changed",
                        task.id,
                        e.currentTarget.checked
                      );
                    }}
                  />
                </Table.Td>

                {/* Dynamic columns based on user selection */}
                {currentColumns.map((column) => (
                  <Table.Td key={`${task.id}-${column.id}`}>
                    {column.renderCell(task)}
                  </Table.Td>
                ))}

                {/* Actions column */}
                <Table.Td>
                  <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                    <ActionIcon size="sm" variant="subtle">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon size="sm" variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />}>
                          {t("Edit")}
                        </Menu.Item>
                        <Menu.Item leftSection={<IconTag size={16} />}>
                          {t("Add Labels")}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                        >
                          {t("Delete")}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
