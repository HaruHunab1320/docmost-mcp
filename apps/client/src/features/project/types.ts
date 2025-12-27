export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskBucket = "none" | "inbox" | "waiting" | "someday";

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  coverImage?: string | null;
  homePageId?: string | null;
  isArchived: boolean;
  startDate?: string;
  endDate?: string;
  spaceId: string;
  workspaceId: string;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    propertyOrder?: any[];
    visibleProperties?: Record<string, boolean>;
    customProperties?: any[];
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  bucket?: TaskBucket;
  position?: string;
  dueDate?: Date | null;
  isCompleted: boolean;
  completedAt?: string;
  estimatedTime?: number;
  pageId?: string;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  icon?: string | null;
  coverImage?: string | null;
  projectId?: string;
  parentTaskId?: string;
  spaceId?: string;
  workspaceId?: string;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
  labels?: Label[];
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  projectId?: string;
  parentTaskId?: string;
  pageId?: string;
  spaceId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  bucket?: TaskBucket;
  dueDate?: Date | null;
  assigneeId?: string | null;
  estimatedTime?: number;
}

export interface UpdateTaskParams {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  bucket?: TaskBucket;
  position?: string;
  dueDate?: Date | null;
  icon?: string | null;
  coverImage?: string | null;
  estimatedTime?: number | null;
  assigneeId?: string | null;
  pageId?: string | null;
}

export interface TaskTriageSummary {
  inbox: Task[];
  dueToday: Task[];
  overdue: Task[];
  goalFocus?: Array<{
    goalId: string;
    name: string;
    horizon?: string;
    taskCount: number;
    taskIds: string[];
    taskTitles: string[];
  }>;
  counts: {
    inbox: number;
    waiting: number;
    someday: number;
  };
}

export interface TaskListParams {
  projectId: string;
  status?: TaskStatus[];
  bucket?: TaskBucket[];
  priority?: TaskPriority;
  assigneeId?: string;
  searchTerm?: string;
  includeSubtasks?: boolean;
  page?: number;
  limit?: number;
}

export interface TaskListBySpaceParams {
  spaceId: string;
  status?: TaskStatus[];
  bucket?: TaskBucket[];
  priority?: TaskPriority;
  assigneeId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
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
  metadata?: Record<string, any>;
}

export interface ProjectListParams {
  spaceId: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
  searchTerm?: string;
}

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
