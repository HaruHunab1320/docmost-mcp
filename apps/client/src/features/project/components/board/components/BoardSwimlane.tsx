import {
  Box,
  Paper,
  Group,
  Badge,
  Text,
  Button,
  Flex,
  ScrollArea,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableTask } from "../../../components/sortable-task";
import { Task, TaskStatus } from "../../../types";
import { useTranslation } from "react-i18next";
import { useRef, useEffect } from "react";
import { Goal } from "@/features/goal/types";

interface BoardSwimlaneProps {
  id: string;
  title: string;
  tasks: Task[];
  users: any[]; // Replace with proper user type
  onCreateTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  containerId: string;
  goalMap?: Record<string, Goal[]>;
}

export function BoardSwimlane({
  id,
  title,
  tasks,
  users,
  onCreateTask,
  onEditTask,
  containerId,
  goalMap,
}: BoardSwimlaneProps) {
  const { t } = useTranslation();
  // Get a direct ref to the viewport inside the ScrollArea
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Use a proper non-passive event listener
  useEffect(() => {
    // We need to manually find the ScrollArea viewport after component mounts
    const findScrollViewport = () => {
      const container = document.getElementById(containerId);
      if (container) {
        // Find the viewport element within the container
        const viewport = container.querySelector(
          ".mantine-ScrollArea-viewport"
        ) as HTMLDivElement;
        if (viewport) {
          return viewport;
        }
      }
      return null;
    };

    // Initially find the viewport and store it
    const viewport = findScrollViewport();
    if (viewport) {
      scrollViewportRef.current = viewport;
    }

    const handleWheel = (e: WheelEvent) => {
      // Prevent the default vertical scroll behavior
      e.preventDefault();
      e.stopPropagation();

      // Use our viewport ref for scrolling
      if (scrollViewportRef.current) {
        // Scroll horizontally based on vertical wheel delta
        scrollViewportRef.current.scrollLeft += e.deltaY;
      } else {
        // Try to find it again if we don't have it
        const viewport = findScrollViewport();
        if (viewport) {
          scrollViewportRef.current = viewport;
          viewport.scrollLeft += e.deltaY;
        }
      }
    };

    // Add the event listener to the container
    const container = document.getElementById(containerId);
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [containerId]);

  return (
    <Paper
      withBorder
      p="md"
      // Prevent any vertical scrolling at the Paper container level
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Group justify="space-between" mb="md">
        <Badge size="lg" variant="light">
          {title}
        </Badge>
        <Group>
          <Text size="sm" c="dimmed">
            {tasks.length}
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="subtle"
            size="xs"
            onClick={() => {
              // Always use "todo" as the default status regardless of swimlane grouping
              // This ensures a valid TaskStatus is always passed
              onCreateTask("todo");
            }}
          >
            {t("Add Task")}
          </Button>
        </Group>
      </Group>

      <Box
        id={containerId}
        style={{
          minHeight: tasks.length > 0 ? "auto" : 80,
          backgroundColor: "var(--mantine-color-dark-6, #f9f9f9)",
          borderRadius: 8,
          padding: 8,
        }}
        className="project-swimlane-container"
        // Prevent any vertical scrolling at the Box level
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={rectSortingStrategy}
        >
          <ScrollArea
            w="100%"
            scrollbarSize={6}
            scrollHideDelay={500}
            type="hover"
            offsetScrollbars
          >
            <Flex
              gap="md"
              wrap="nowrap"
              style={{
                padding: "4px 4px 12px 4px",
                minWidth: "100%",
              }}
            >
              {tasks.map((task) => (
                <Box key={task.id} style={{ width: 250, flexShrink: 0 }}>
                  <SortableTask
                    id={task.id}
                    task={task}
                    onClick={() => onEditTask(task)}
                    users={users}
                    goalMap={goalMap}
                  />
                </Box>
              ))}
              {tasks.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" w="100%" py="sm">
                  {t("No tasks")}
                </Text>
              )}
            </Flex>
          </ScrollArea>
        </SortableContext>
      </Box>
    </Paper>
  );
}
