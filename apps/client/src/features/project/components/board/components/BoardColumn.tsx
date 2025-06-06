import {
  Box,
  Paper,
  Group,
  Badge,
  Text,
  Stack,
  Button,
  ScrollArea,
  ActionIcon,
  Menu,
  Tooltip,
  Switch,
} from "@mantine/core";
import {
  IconPlus,
  IconDotsVertical,
  IconEye,
  IconEyeOff,
  IconTrash,
} from "@tabler/icons-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTask } from "../../../components/sortable-task";
import { Task, TaskStatus } from "../../../types";
import { useTranslation } from "react-i18next";
import { getStatusLabel } from "../board-utils";
import { useRef, useState } from "react";
import { useCreateTaskMutation } from "../../../hooks/use-tasks";
import { useBoardContext } from "../board-context";

interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  users: any[]; // Replace with proper user type
  onCreateTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
}

export function BoardColumn({
  status,
  tasks,
  users,
  onCreateTask,
  onEditTask,
}: BoardColumnProps) {
  const { t } = useTranslation();
  const columnBoxRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const { project } = useBoardContext();
  const createTaskMutation = useCreateTaskMutation();

  // Handle quick task creation
  const handleQuickCreateTask = () => {
    createTaskMutation.mutate({
      title: "New Task",
      status: status,
      projectId: project.id,
      spaceId: project.spaceId,
      priority: "medium",
    });
  };

  // Handle mock actions (these would be implemented with real functionality)
  const handleDeleteColumn = () => {
    // This would be implemented with actual delete logic
    console.log("Delete column:", status);
  };

  const handleHideGroup = () => {
    // This would be implemented with actual hide logic
    console.log("Hide group:", status);
  };

  return (
    <Box
      ref={columnBoxRef}
      style={{
        width: 280,
        minWidth: 280,
        flexShrink: 0,
        marginRight: 8,
        height: "100%",
      }}
    >
      <Paper
        id={`status-${status}`}
        withBorder
        p="md"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Column header with hover controls */}
        <Group justify="space-between" mb="sm" style={{ position: "relative" }}>
          <Group gap="xs">
            <Badge size="lg" variant="light">
              {t(getStatusLabel(status))}
            </Badge>
            {/* Only show count if showCount is true */}
            {showCount && (
              <Text size="sm" c="dimmed">
                {tasks.length}
              </Text>
            )}
          </Group>

          {/* Controls that appear on hover */}
          <Group
            style={{
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.2s ease",
              position: "absolute",
              right: 0,
              top: 0,
              backgroundColor: "var(--mantine-color-body)",
              padding: "0 4px",
              borderRadius: "4px",
            }}
          >
            <Tooltip label={t("Add task")}>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={handleQuickCreateTask}
                loading={createTaskMutation.isPending}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>

            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={
                    showCount ? <IconEyeOff size={16} /> : <IconEye size={16} />
                  }
                  onClick={() => setShowCount(!showCount)}
                >
                  {showCount ? t("Hide") : t("Show")} task count
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={handleDeleteColumn}
                >
                  {t("Delete column")}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconEyeOff size={16} />}
                  onClick={handleHideGroup}
                >
                  {t("Hide group")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* ScrollArea handles vertical scrolling within the column */}
        <ScrollArea
          ref={scrollAreaRef}
          style={{
            flex: 1,
            minHeight: 0, // Important for proper flexbox behavior
          }}
          h="100%"
          offsetScrollbars
          scrollbarSize={6}
          type="auto"
          scrollHideDelay={500}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap="xs" p="xs">
              {tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  id={task.id}
                  task={task}
                  onClick={() => onEditTask(task)}
                  users={users}
                />
              ))}
              {tasks.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  {t("No tasks in this status")}
                </Text>
              )}
            </Stack>
          </SortableContext>
        </ScrollArea>
      </Paper>
    </Box>
  );
}
