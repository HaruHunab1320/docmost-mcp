import { IUser } from "@/features/user/types/user.types";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskBucket = "none" | "inbox" | "waiting" | "someday";

// Label colors supported by the system
export type LabelColor =
  | "red"
  | "pink"
  | "grape"
  | "violet"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "lime"
  | "yellow"
  | "orange"
  | "gray";

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  coverImage?: string | null;
  isArchived: boolean;
  startDate?: string;
  endDate?: string;
  spaceId: string;
  workspaceId: string;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
  creator?: IUser;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  bucket?: TaskBucket;
  position?: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  estimatedTime?: number;
  projectId?: string;
  parentTaskId?: string;
  pageId?: string;
  creatorId?: string;
  assigneeId?: string;
  spaceId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields
  creator?: IUser;
  assignee?: IUser;
  project?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  parent?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  labels?: Label[];
}

export interface ProjectListParams {
  spaceId: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
  searchTerm?: string;
}

export interface TaskListParams {
  projectId: string;
  page?: number;
  limit?: number;
  status?: TaskStatus[];
  bucket?: TaskBucket[];
  searchTerm?: string;
  includeSubtasks?: boolean;
}

export interface TaskListBySpaceParams {
  spaceId: string;
  page?: number;
  limit?: number;
  status?: TaskStatus[];
  bucket?: TaskBucket[];
  searchTerm?: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  spaceId: string;
  icon?: string;
  color?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateProjectParams {
  projectId: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  coverImage?: string | null;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  bucket?: TaskBucket;
  dueDate?: Date;
  projectId?: string;
  parentTaskId?: string;
  pageId?: string;
  assigneeId?: string;
  spaceId: string;
  estimatedTime?: number;
}

export interface UpdateTaskParams {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  bucket?: TaskBucket;
  dueDate?: Date | null;
  estimatedTime?: number | null;
  assigneeId?: string | null;
  position?: string;
}

export interface TaskTriageSummary {
  inbox: Task[];
  dueToday: Task[];
  overdue: Task[];
  counts: {
    inbox: number;
    waiting: number;
    someday: number;
  };
}

export interface CreateLabelParams {
  name: string;
  color: LabelColor;
  workspaceId: string;
}

export interface UpdateLabelParams {
  labelId: string;
  name?: string;
  color?: LabelColor;
}

export interface AssignLabelToTaskParams {
  taskId: string;
  labelId: string;
}

export interface RemoveLabelFromTaskParams {
  taskId: string;
  labelId: string;
}
