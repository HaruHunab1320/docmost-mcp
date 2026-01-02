import { useMemo, useState, useEffect, useRef } from "react";
import {
  Flex,
  Stack,
  Box,
  Text,
  Loader,
  Button,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  rectIntersection,
} from "@dnd-kit/core";
import { BoardProvider, useBoardContext } from "../board-context";
import { BoardHeader } from "./BoardHeader";
import { BoardControls } from "./BoardControls";
import { BoardColumn } from "./BoardColumn";
import { BoardSwimlane } from "./BoardSwimlane";
import { BoardList } from "./BoardList";
import { BoardTimeline } from "./BoardTimeline";
import { BoardColumns } from "./BoardColumns";
import {
  useFilteredTasks,
  useGroupedTasks,
  useTaskOperations,
  TASKS_BY_PROJECT_KEY,
} from "../board-hooks";
import { TaskCard } from "../../../components/task-card";
import { Task, TaskStatus } from "../../../types";
import { Project } from "../../../types/index";
import { useDisclosure } from "@mantine/hooks";
import { useWorkspaceUsers } from "@/features/user/hooks/use-workspace-users";
import { ProjectHeader } from "@/features/project/components/project-header.tsx";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import TaskFormModal from "../../../components/task-form-modal";
import { TaskDrawer } from "../../../components/task-drawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listGoalsForTasks } from "@/features/goal/services/goal-service";
import { Goal } from "@/features/goal/types";

// CSS class name for when we need to disable scrolling
const NO_SCROLL_CLASS = "raven-docs-board-no-scroll";

// Define an extended Task interface that includes position for type-checking
interface TaskWithPosition extends Task {
  position?: string;
  createdAt: string;
}

interface BoardProps {
  project: Project;
  onBack: () => void;
}

export function Board({ project, onBack }: BoardProps) {
  return (
    <BoardProvider project={project} onBack={onBack}>
      <Box>
        <ProjectHeader project={project} onBack={onBack} />
        <BoardContent project={project} spaceId={project.spaceId} />
      </Box>
    </BoardProvider>
  );
}

function BoardContent({ project, spaceId }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  console.log(
    "BoardContent rendering with project:",
    project,
    "spaceId:",
    spaceId
  );

  const [opened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<Task | null>(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const {
    viewMode,
    groupBy,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    labelFilter,
    goalFilter,
    searchTerm,
    showCompletedTasks,
    dateRangeFilter,
    sortBy,
    sortOrder,
  } = useBoardContext();

  // Get the tasks based on the project and filters
  const {
    tasks,
    isLoading: isTasksLoading,
    rawTasks: tasksData,
  } = useFilteredTasks({
    projectId: project.id,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    labelFilter,
    searchTerm,
    showCompletedTasks,
    dateRangeFilter,
    sortBy,
    sortOrder,
  });
  const taskIds = tasksData?.items?.map((task) => task.id) || [];
  const goalsQuery = useQuery({
    queryKey: ["task-goals", project.id, project.workspaceId, taskIds],
    queryFn: () =>
      listGoalsForTasks({
        workspaceId: project.workspaceId,
        taskIds,
      }),
    enabled: taskIds.length > 0,
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
  const goalFilteredTasks = useMemo(() => {
    if (goalFilter.length === 0) return tasks;
    return tasks.filter((task) =>
      (goalMap[task.id] || []).some((goal) => goalFilter.includes(goal.id)),
    );
  }, [tasks, goalMap, goalFilter]);

  // Get the users for avatar display
  const { data: usersData, isLoading: isUsersLoading } = useWorkspaceUsers({
    workspaceId: project.workspaceId,
  });
  const users = usersData?.items || [];

  // Get the task update operations
  const { updateTaskStatus, updateTaskPosition } = useTaskOperations();

  // Group tasks by the selected grouping method
  const { groupedTasks } = useGroupedTasks({
    tasks: goalFilteredTasks,
    groupBy,
    workspaceId: project.workspaceId,
  });

  const labelOptions = useMemo(() => {
    const labelsMap = new Map<string, { value: string; label: string }>();
    tasksData?.items?.forEach((task) => {
      (task as any).labels?.forEach((label) => {
        if (!labelsMap.has(label.id)) {
          labelsMap.set(label.id, { value: label.id, label: label.name });
        }
      });
    });
    return Array.from(labelsMap.values());
  }, [tasksData?.items]);

  // Prevent scrolling when dragging
  useEffect(() => {
    if (activeId) {
      document.body.classList.add(NO_SCROLL_CLASS);
    } else {
      document.body.classList.remove(NO_SCROLL_CLASS);
    }

    return () => {
      document.body.classList.remove(NO_SCROLL_CLASS);
    };
  }, [activeId]);

  // Render Kanban board
  const renderKanbanBoard = () => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Flex
          gap="md"
          align="stretch"
          style={{
            minHeight: "calc(100vh - 300px)",
            maxHeight: "calc(100vh - 200px)",
            overflowX: "auto",
            overflowY: "hidden",
            padding: "0.5rem",
          }}
        >
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <BoardColumn
              key={status}
              status={status as any}
              tasks={statusTasks as Task[]}
              users={users}
              onCreateTask={handleCreateTask}
              onEditTask={handleEditTask}
              goalMap={goalMap}
            />
          ))}

          {/* Drag overlay showing the task being dragged */}
          <DragOverlay>
            {activeId && activeDragData ? (
              <Box style={{ width: "250px", opacity: 0.8 }}>
                <TaskCard
                  task={activeDragData}
                  onClick={() => {}}
                  isDragging={true}
                  users={users}
                  goalMap={goalMap}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </Flex>
      </DndContext>
    );
  };

  // Render Swimlanes
  const renderSwimlanes = () => {
    const containerId = "board-swimlanes";

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box
          id={containerId}
          style={{
            minHeight: "calc(100vh - 300px)",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            padding: "0.5rem",
          }}
        >
          <Stack gap="md">
            {Object.entries(groupedTasks).map(([lane, laneTasks]) => (
              <BoardSwimlane
                key={lane}
                id={lane}
                title={lane}
                tasks={laneTasks as Task[]}
                users={users}
                onCreateTask={handleCreateTask}
                onEditTask={handleEditTask}
                containerId={containerId}
                goalMap={goalMap}
              />
            ))}
          </Stack>

          {/* Drag overlay showing the task being dragged */}
          <DragOverlay>
            {activeId && activeDragData ? (
              <Box style={{ width: "250px", opacity: 0.8 }}>
                <TaskCard
                  task={activeDragData}
                  onClick={() => {}}
                  isDragging={true}
                  users={users}
                  goalMap={goalMap}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </Box>
      </DndContext>
    );
  };

  // Handle task creation
  const handleCreateTask = (status) => {
    // Make sure status is a valid TaskStatus
    const validStatus = [
      "todo",
      "in_progress",
      "in_review",
      "done",
      "blocked",
    ].includes(status)
      ? status
      : "todo";

    // Store the selected status in the board context
    setSelectedTask({
      status: validStatus, // Use validated status
      title: "",
      description: "",
      priority: "medium",
    } as any);
    openForm();
  };

  // Wrapper for components that don't pass status
  const handleCreateTaskWithoutStatus = () => {
    handleCreateTask("todo"); // Default to 'todo' status
  };

  // Handle task editing
  const handleEditTask = (task) => {
    setSelectedTaskId(task.id);
    setDrawerOpened(true);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpened(false);
    setSelectedTaskId(null);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const draggedTask = tasks.find((task) => task.id === active.id);
    setActiveDragData(draggedTask || null);
  };

  // Improved position generation function
  function generatePositionBetween(
    before: string | null,
    after: string | null
  ): string {
    console.log(`POS_GEN: Inputs - Before: ${before}, After: ${after}`);

    // Simplified LexoRank-like key generation (using lowercase alphabet a-z)
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const midChar = alphabet[Math.floor(alphabet.length / 2)]; // 'm'

    // Case 1: No neighbors (first item in an empty list)
    if (!before && !after) {
      console.log("POS_GEN: Case 1 - First item");
      return midChar; // 'm'
    }

    // Case 2: Insert at the beginning
    if (!before) {
      // If 'after' looks like an ID (long hex string), generate position before 'm'
      if (after && after.length > 10 && /^[a-f0-9-]+$/.test(after)) {
        console.log("POS_GEN: Case 2a - Before ID, placing before 'm'");
        return alphabet[Math.floor(alphabet.indexOf(midChar) / 2)]; // e.g., 'f'
      }
      // If 'after' is a valid position string
      const firstChar = after![0];
      const prevCharIndex = alphabet.indexOf(firstChar) - 1;
      if (prevCharIndex >= 0) {
        console.log(
          `POS_GEN: Case 2b - Before valid pos '${after}', placing one char before`
        );
        return alphabet[prevCharIndex];
      } else {
        console.log(
          `POS_GEN: Case 2c - Before smallest pos '${after}', prepending 'a'`
        );
        return "a" + after; // Cannot go before 'a', so prepend 'a'
      }
    }

    // Case 3: Insert at the end
    if (!after) {
      // If 'before' looks like an ID, generate position after 'm'
      if (before && before.length > 10 && /^[a-f0-9-]+$/.test(before)) {
        console.log("POS_GEN: Case 3a - After ID, placing after 'm'");
        return alphabet[
          Math.floor((alphabet.indexOf(midChar) + alphabet.length) / 2)
        ]; // e.g., 't'
      }
      // If 'before' is a valid position string
      const lastChar = before[before.length - 1];
      const nextCharIndex = alphabet.indexOf(lastChar) + 1;
      if (nextCharIndex < alphabet.length) {
        console.log(
          `POS_GEN: Case 3b - After valid pos '${before}', placing one char after`
        );
        return before.substring(0, before.length - 1) + alphabet[nextCharIndex];
      } else {
        console.log(
          `POS_GEN: Case 3c - After largest pos '${before}', appending 'z'`
        );
        return before + "z"; // Cannot go after 'z', so append 'z'
      }
    }

    // Case 4: Insert between two valid position strings (or IDs treated as boundaries)
    // This requires a more complex fractional indexing or string comparison logic
    // For simplicity here, let's just append the midChar to the 'before' string
    // This isn't perfectly balanced but avoids the ID prefix issue.
    console.log(
      `POS_GEN: Case 4 - Between '${before}' and '${after}', simple append`
    );
    // Basic check: If inputs look like IDs, return something predictable
    if (
      (before.length > 10 && /^[a-f0-9-]+$/.test(before)) ||
      (after.length > 10 && /^[a-f0-9-]+$/.test(after))
    ) {
      console.log(
        "POS_GEN: Case 4a - Inputs look like IDs, returning predictable middle"
      );
      return before + midChar; // Append 'm' to the 'before' ID (crude but avoids prefix issue)
    }

    // Simplified midpoint logic for actual position strings
    let prefix = "";
    let i = 0;
    while (i < before.length && i < after.length && before[i] === after[i]) {
      prefix += before[i];
      i++;
    }

    const charBefore = i < before.length ? before[i] : "a"; // Assume 'a' if prefix matches 'before' fully
    const charAfter = i < after.length ? after[i] : "z"; // Assume 'z' if prefix matches 'after' fully

    const indexBefore = alphabet.indexOf(charBefore);
    const indexAfter = alphabet.indexOf(charAfter);

    if (indexAfter - indexBefore > 1) {
      const midIndex = Math.floor((indexBefore + indexAfter) / 2);
      console.log(
        `POS_GEN: Case 4b - Found space, middle char: ${alphabet[midIndex]}`
      );
      return prefix + alphabet[midIndex];
    } else {
      // No space, extend 'before' by adding the middle character
      console.log(
        `POS_GEN: Case 4c - No space, extending before with '${midChar}'`
      );
      return before + midChar;
    }
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // Add more detail to the initial log
    console.log("DRAG_END: Event received", {
      active: { id: active?.id, data: active?.data.current },
      over: { id: over?.id, data: over?.data.current }, // Log data associated with the drop target
    });

    if (!active || !over) {
      console.log("DRAG_END: No active or over, exiting.");
      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const activeTask = tasks.find(
      (task) => task.id === activeId
    ) as TaskWithPosition;

    if (!activeTask) {
      console.error("DRAG_END: Active task not found!");
      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    console.log(
      `DRAG_END: Active Task ID: ${activeId}, Status: ${activeTask.status}`
    );
    console.log(`DRAG_END: Over ID: ${overId}, Over Data:`, over.data.current);

    // Check if dropping onto a column drop zone (using the data we set in useDroppable)
    if (over.data.current?.type === "column") {
      const newStatus = over.data.current.status as TaskStatus;
      if (activeTask.status !== newStatus) {
        console.log(
          `DRAG_END: *** Status Change Detected *** Moving task ${activeId} from ${activeTask.status} to ${newStatus} (Dropped on column)`
        );
        updateTaskStatus(activeId, newStatus);
      } else {
        console.log(
          `DRAG_END: Dropped on same status column (${newStatus}), no status change needed.`
        );
      }
    }
    // Check if dropping onto another task for reordering
    else if (over.data.current?.type === "task" || !over.data.current?.type) {
      // Assume it's a task if type is 'task' or undefined
      const overTask = tasks.find(
        (task) => task.id === overId
      ) as TaskWithPosition;
      if (overTask && activeTask.status === overTask.status) {
        console.log(
          `DRAG_END: *** Reorder Detected *** Reordering task ${activeId} relative to ${overId} in status ${activeTask.status} (Dropped on task)`
        );
        // --- Reordering Logic ---
        const columnTasks = tasks.filter(
          (task) => task.status === activeTask.status
        ) as TaskWithPosition[];

        const sortedTasks = [...columnTasks].sort((a, b) => {
          const aPos = a.position || a.id;
          const bPos = b.position || b.id;
          return aPos.localeCompare(bPos);
        });

        const activeIndex = sortedTasks.findIndex((t) => t.id === activeId);
        const overIndex = sortedTasks.findIndex((t) => t.id === overId);

        if (activeIndex === -1 || overIndex === -1) {
          console.error("DRAG_END: Reorder failed - task index not found.");
          // Reset state without returning might be needed
          setActiveId(null);
          setActiveDragData(null);
          return;
        }
        if (activeIndex === overIndex) {
          console.log("DRAG_END: Dropped on self, no reorder needed.");
          // Reset state without returning might be needed
          setActiveId(null);
          setActiveDragData(null);
          return;
        }

        let newPosition: string;
        const targetIndex = activeIndex < overIndex ? overIndex : overIndex;
        console.log(
          `DRAG_END: Reorder indices - Active: ${activeIndex}, Over: ${overIndex}, Target for calculation: ${targetIndex}`
        );

        if (targetIndex === 0) {
          const afterTask = sortedTasks[0];
          const afterPosition = afterTask.position || afterTask.id;
          console.log(
            `DRAG_END: Reordering to top. Before: null, After: ${afterPosition}`
          );
          newPosition = generatePositionBetween(null, afterPosition);
        } else {
          const beforeTask = sortedTasks[targetIndex - 1];
          const afterTask = sortedTasks[targetIndex];
          const beforePosition = beforeTask.position || beforeTask.id;
          const afterPosition = afterTask
            ? afterTask.position || afterTask.id
            : null;
          console.log(
            `DRAG_END: Reordering between/end. Before: ${beforePosition}, After: ${afterPosition}`
          );
          newPosition = generatePositionBetween(beforePosition, afterPosition);
        }

        console.log(
          `DRAG_END: Generated new position: ${newPosition} for task ${activeId}`
        );
        console.log(
          `DRAG_END: Calling updateTaskPosition with taskId: ${activeId}, newPosition: ${newPosition}`
        );
        updateTaskPosition(activeId, newPosition);

        // --- Optimistic Update ---
        const updatedTasks = tasks.map((task) => {
          if (task.id === activeId) {
            return { ...task, position: newPosition };
          }
          return task;
        });

        const currentData = queryClient.getQueryData<{
          items: Task[];
          pagination: any;
        }>([TASKS_BY_PROJECT_KEY, { projectId: project.id }]);
        queryClient.setQueryData(
          [TASKS_BY_PROJECT_KEY, { projectId: project.id }],
          {
            items: updatedTasks,
            pagination: currentData?.pagination || {
              page: 1,
              limit: 100,
              total: updatedTasks.length,
              totalPages: 1,
            },
          }
        );
      } else {
        console.log(
          `DRAG_END: Drop detected, but not a valid reorder target (different status or task not found). Over ID: ${overId}, Over Data:`,
          over.data.current
        );
      }
    } else {
      console.log(
        `DRAG_END: Drop detected onto an unknown target type. Over ID: ${overId}, Over Data:`,
        over.data.current
      );
    }

    // Reset drag state regardless
    setActiveId(null);
    setActiveDragData(null);
  };

  // Toggle filters visibility
  const toggleFilters = () => {
    setIsFiltersVisible(!isFiltersVisible);
  };

  // Set up proper DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts - allows for click events
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        // Implementation for keyboard coordinates getter if needed
        return null;
      },
    })
  );

  // Render the appropriate view based on viewMode
  const renderContent = () => {
    if (isTasksLoading || isUsersLoading) {
      return (
        <Box ta="center" py="xl">
          <Loader size="lg" />
          <Text mt="md">Loading tasks...</Text>
        </Box>
      );
    }

    switch (viewMode) {
      case "kanban":
        return renderKanbanBoard();
      case "swimlane":
        return renderSwimlanes();
      case "list":
        return (
          <BoardList
            tasks={goalFilteredTasks}
            users={users}
            onEditTask={handleEditTask}
            onCreateTask={handleCreateTaskWithoutStatus}
            goalMap={goalMap}
          />
        );
      case "timeline":
        return (
          <BoardTimeline
            tasks={goalFilteredTasks}
            users={users}
            onEditTask={handleEditTask}
            onCreateTask={handleCreateTaskWithoutStatus}
            goalMap={goalMap}
          />
        );
      case "columns":
        return (
          <BoardColumns
            tasks={goalFilteredTasks}
            users={users}
            onEditTask={handleEditTask}
            onCreateTask={handleCreateTaskWithoutStatus}
            goalMap={goalMap}
          />
        );
      default:
        return (
          <Text ta="center" size="lg" py="xl">
            Unknown view mode
          </Text>
        );
    }
  };

  return (
    <Box>
      <BoardHeader onToggleFilters={toggleFilters} />

      <BoardControls
        isVisible={isFiltersVisible}
        labelOptions={labelOptions}
      />

      {renderContent()}

      {/* Task Creation Modal */}
      <TaskFormModal
        opened={opened}
        onClose={closeForm}
        projectId={project.id}
        spaceId={spaceId}
        task={selectedTask}
      />

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        opened={drawerOpened}
        onClose={handleDrawerClose}
        spaceId={spaceId}
      />
    </Box>
  );
}
