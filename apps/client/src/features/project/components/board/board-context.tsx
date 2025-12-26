import { createContext, useContext, useState, ReactNode } from "react";
import { Project, Task, TaskPriority, TaskStatus } from "../../types";

type ViewMode = "kanban" | "swimlane" | "list" | "timeline" | "columns";
type GroupBy = "status" | "assignee" | "priority" | "date" | "labels";
type SortBy = "priority" | "dueDate" | "createdAt" | "title" | "position";
type SortOrder = "asc" | "desc";

interface BoardContextValue {
  // Current project
  project: Project;

  // View and grouping options
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  groupBy: GroupBy;
  setGroupBy: (group: GroupBy) => void;

  // Filtering options
  statusFilter: TaskStatus[];
  setStatusFilter: (statuses: TaskStatus[]) => void;
  priorityFilter: TaskPriority[];
  setPriorityFilter: (priorities: TaskPriority[]) => void;
  assigneeFilter: string[];
  setAssigneeFilter: (assignees: string[]) => void;
  labelFilter: string[];
  setLabelFilter: (labels: string[]) => void;
  goalFilter: string[];
  setGoalFilter: (goals: string[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showCompletedTasks: boolean;
  setShowCompletedTasks: (show: boolean) => void;
  dateRangeFilter: [Date | null, Date | null];
  setDateRangeFilter: (range: [Date | null, Date | null]) => void;

  // Sorting options
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;

  // Drag and drop state
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  activeDragData: Task | null;
  setActiveDragData: (task: Task | null) => void;

  // Task form state
  isFormOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;

  // Advanced filters state
  isAdvancedFiltersOpen: boolean;
  openAdvancedFilters: () => void;
  closeAdvancedFilters: () => void;

  // Navigation
  onBack: () => void;
}

// Create context with a default undefined value
const BoardContext = createContext<BoardContextValue | undefined>(undefined);

interface BoardProviderProps {
  children: ReactNode;
  project: Project;
  onBack: () => void;
}

export function BoardProvider({
  children,
  project,
  onBack,
}: BoardProviderProps) {
  // Debug log
  console.log(
    "BoardProvider rendering with project:",
    project?.id,
    project?.name
  );

  // View and grouping state
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [goalFilter, setGoalFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [dateRangeFilter, setDateRangeFilter] = useState<
    [Date | null, Date | null]
  >([null, null]);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<Task | null>(null);

  // Task form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const openForm = () => setIsFormOpen(true);
  const closeForm = () => setIsFormOpen(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Advanced filters state
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const openAdvancedFilters = () => setIsAdvancedFiltersOpen(true);
  const closeAdvancedFilters = () => setIsAdvancedFiltersOpen(false);

  const value: BoardContextValue = {
    project,
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    labelFilter,
    setLabelFilter,
    goalFilter,
    setGoalFilter,
    searchTerm,
    setSearchTerm,
    showCompletedTasks,
    setShowCompletedTasks,
    dateRangeFilter,
    setDateRangeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    activeId,
    setActiveId,
    activeDragData,
    setActiveDragData,
    isFormOpen,
    openForm,
    closeForm,
    selectedTask,
    setSelectedTask,
    isAdvancedFiltersOpen,
    openAdvancedFilters,
    closeAdvancedFilters,
    onBack,
  };

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

// Custom hook to use the board context
export function useBoardContext() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error("useBoardContext must be used within a BoardProvider");
  }
  return context;
}
