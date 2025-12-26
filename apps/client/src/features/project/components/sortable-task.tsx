import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowRight,
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { Task, TaskStatus } from "../types";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useTranslation } from "react-i18next";
import { TaskCard } from "./task-card";
import { Goal } from "@/features/goal/types";

// Map of status to column title (duplicated from project-board for component independence)
const statusColumnMap: Record<TaskStatus, { title: string; color: string }> = {
  todo: { title: "To Do", color: "gray" },
  in_progress: { title: "In Progress", color: "blue" },
  in_review: { title: "In Review", color: "indigo" },
  done: { title: "Done", color: "green" },
  blocked: { title: "Blocked", color: "red" },
};

// Order of columns in the board
const columnOrder: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
];

interface SortableTaskProps {
  id: string;
  task: Task;
  onClick: () => void;
  users?: any[];
  goalMap?: Record<string, Goal[]>;
}

export function SortableTask({
  id,
  task,
  onClick,
  users = [],
  goalMap,
}: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={onClick}
        isDragging={isDragging}
        users={users}
        goalMap={goalMap}
      />
    </div>
  );
}
