import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskRepo } from '../../../database/repos/task/task.repo';
import { TaskLabelRepo } from '../../../database/repos/task/task-label.repo';
import { ProjectRepo } from '../../../database/repos/project/project.repo';
import { SpaceRepo } from '../../../database/repos/space/space.repo';
import { PageRepo } from '../../../database/repos/page/page.repo';
import { WorkspaceRepo } from '@raven-docs/db/repos/workspace/workspace.repo';
import { GoalService } from '../../goal/goal.service';
import { resolveAgentSettings } from '../../agent/agent-settings';
import {
  InsertableTask,
  Task,
  UpdatableTask,
} from '../../../database/types/entity.types';
import { PaginationOptions } from '../../../lib/pagination/pagination-options';
import { Paginated } from '../../../lib/pagination/paginated';
import { TaskBucket, TaskPriority, TaskStatus } from '../constants/task-enums';
import { AgentMemoryService } from '../../agent-memory/agent-memory.service';
import { extractTaskItems } from '../../../common/helpers/prosemirror/utils';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepo: TaskRepo,
    private readonly taskLabelRepo: TaskLabelRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly spaceRepo: SpaceRepo,
    private readonly pageRepo: PageRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly goalService: GoalService,
    private readonly agentMemoryService: AgentMemoryService,
  ) {}

  async findById(
    taskId: string,
    options?: {
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeParentTask?: boolean;
      includeLabels?: boolean;
      includeWatchers?: boolean;
    },
  ): Promise<Task | undefined> {
    return this.taskRepo.findById(taskId, options);
  }

  async findByProjectId(
    projectId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: TaskBucket[];
      searchTerm?: string;
      includeSubtasks?: boolean;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<Paginated<Task>> {
    console.log('[TaskService] findByProjectId called with:', {
      projectId,
      projectIdType: typeof projectId,
      projectIdLength: projectId?.length,
      pagination,
      options,
    });

    try {
      const result = await this.taskRepo.findByProjectId(
        projectId,
        pagination,
        options,
      );
      console.log('[TaskService] findByProjectId succeeded:', {
        resultDataCount: result?.data?.length,
        pagination: result?.pagination,
      });
      return result;
    } catch (error: any) {
      console.error('[TaskService] findByProjectId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        projectId,
      });
      throw error;
    }
  }

  async findByParentTaskId(
    parentTaskId: string,
    pagination: PaginationOptions,
    options?: {
      includeCreator?: boolean;
      includeAssignee?: boolean;
    },
  ): Promise<Paginated<Task>> {
    return this.taskRepo.findByParentTaskId(parentTaskId, pagination, options);
  }

  async findBySpaceId(
    spaceId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: TaskBucket[];
      searchTerm?: string;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<Paginated<Task>> {
    console.log('[TaskService] findBySpaceId called with:', {
      spaceId,
      spaceIdType: typeof spaceId,
      spaceIdLength: spaceId?.length,
      pagination,
      options,
    });

    try {
      const result = await this.taskRepo.findBySpaceId(
        spaceId,
        pagination,
        options,
      );
      console.log('[TaskService] findBySpaceId succeeded:', {
        resultDataCount: result?.data?.length,
        pagination: result?.pagination,
      });
      return result;
    } catch (error: any) {
      console.error('[TaskService] findBySpaceId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        spaceId,
      });
      throw error;
    }
  }

  async findByAssigneeId(
    assigneeId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      searchTerm?: string;
      includeCreator?: boolean;
      includeProject?: boolean;
      workspaceId?: string;
    },
  ): Promise<Paginated<Task>> {
    return this.taskRepo.findByAssigneeId(assigneeId, pagination, options);
  }

  async listLabels(workspaceId: string) {
    return this.taskLabelRepo.listByWorkspace(workspaceId);
  }

  async createLabel(workspaceId: string, data: { name: string; color: string }) {
    return this.taskLabelRepo.createLabel({
      name: data.name,
      color: data.color,
      workspaceId,
    });
  }

  async updateLabel(
    workspaceId: string,
    labelId: string,
    data: { name?: string; color?: string },
  ) {
    const label = await this.taskLabelRepo.findById(labelId);
    if (!label || label.workspaceId !== workspaceId) {
      throw new NotFoundException('Label not found');
    }
    return this.taskLabelRepo.updateLabel(labelId, data);
  }

  async deleteLabel(workspaceId: string, labelId: string) {
    const label = await this.taskLabelRepo.findById(labelId);
    if (!label || label.workspaceId !== workspaceId) {
      throw new NotFoundException('Label not found');
    }
    await this.taskLabelRepo.deleteLabel(labelId);
    return { success: true };
  }

  async assignLabel(
    workspaceId: string,
    taskId: string,
    labelId: string,
  ) {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found');
    }
    const label = await this.taskLabelRepo.findById(labelId);
    if (!label || label.workspaceId !== workspaceId) {
      throw new NotFoundException('Label not found');
    }
    await this.taskLabelRepo.assignLabel({
      taskId,
      labelId,
      createdAt: new Date(),
    });
    return { success: true };
  }

  async removeLabel(
    workspaceId: string,
    taskId: string,
    labelId: string,
  ) {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found');
    }
    const label = await this.taskLabelRepo.findById(labelId);
    if (!label || label.workspaceId !== workspaceId) {
      throw new NotFoundException('Label not found');
    }
    await this.taskLabelRepo.removeLabel(taskId, labelId);
    return { success: true };
  }

  async getDailyTriageSummary(
    spaceId: string,
    options?: {
      limit?: number;
      workspaceId?: string;
    },
  ) {
    const triage = await this.taskRepo.getDailyTriageSummary(spaceId, options);
    if (!options?.workspaceId) {
      return triage;
    }

    let workspaceId = options.workspaceId;
    const workspace = await this.workspaceRepo.findById(workspaceId);
    const agentSettings = resolveAgentSettings(workspace?.settings);
    if (!agentSettings.enableAutoTriage) {
      return triage;
    }

    const tasks = [...triage.inbox, ...triage.dueToday, ...triage.overdue];
    if (!tasks.length) {
      return { ...triage, goalFocus: [] };
    }

    const goalFocus = new Map<
      string,
      { goalId: string; name: string; horizon?: string; tasks: Task[] }
    >();

    const goals = await this.goalService.listGoals(workspaceId, spaceId);

    const matchGoals = (text: string) => {
      const lowered = text.toLowerCase();
      return goals.filter((goal) => {
        const keywords = Array.isArray(goal.keywords) ? goal.keywords : [];
        return keywords.some((keyword) =>
          lowered.includes(String(keyword).toLowerCase()),
        );
      });
    };

    for (const task of tasks.slice(0, 20)) {
      const text = [task.title, task.description].filter(Boolean).join(' ');
      if (!text) continue;
      const matches = matchGoals(text);
      matches.forEach((goal) => {
        const entry = goalFocus.get(goal.id) || {
          goalId: goal.id,
          name: goal.name,
          horizon: goal.horizon,
          tasks: [],
        };
        entry.tasks.push(task);
        goalFocus.set(goal.id, entry);
      });
    }

    const goalSummary = Array.from(goalFocus.values())
      .map((entry) => ({
        goalId: entry.goalId,
        name: entry.name,
        horizon: entry.horizon,
        taskCount: entry.tasks.length,
        taskIds: entry.tasks.map((task) => task.id),
        taskTitles: entry.tasks.map((task) => task.title),
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 5);

    return { ...triage, goalFocus: goalSummary };
  }

  async create(
    userId: string,
    workspaceId: string,
    data: {
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
    },
  ): Promise<Task> {
    // Check if space exists
    const space = await this.spaceRepo.findById(data.spaceId, workspaceId);
    if (!space) {
      throw new NotFoundException(`Space with id ${data.spaceId} not found`);
    }

    // Verify project if provided
    if (data.projectId) {
      const project = await this.projectRepo.findById(data.projectId);
      if (
        !project ||
        project.workspaceId !== workspaceId ||
        project.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Project not found or does not belong to the workspace/space',
        );
      }
    }

    // Verify parent task if provided
    if (data.parentTaskId) {
      const parentTask = await this.taskRepo.findById(data.parentTaskId);
      if (
        !parentTask ||
        parentTask.workspaceId !== workspaceId ||
        parentTask.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Parent task not found or does not belong to the workspace/space',
        );
      }
    }

    // Verify page if provided
    if (data.pageId) {
      const page = await this.pageRepo.findById(data.pageId);
      if (
        !page ||
        page.workspaceId !== workspaceId ||
        page.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Page not found or does not belong to the workspace/space',
        );
      }
    }

    const taskData: InsertableTask = {
      title: data.title,
      description: data.description,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      bucket: data.bucket || TaskBucket.NONE,
      dueDate: data.dueDate,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      pageId: data.pageId,
      assigneeId: data.assigneeId,
      creatorId: userId,
      spaceId: data.spaceId,
      workspaceId,
      isCompleted: data.status === TaskStatus.DONE,
      completedAt: data.status === TaskStatus.DONE ? new Date() : null,
      estimatedTime: data.estimatedTime,
    };

    const task = await this.taskRepo.create(taskData);

    this.recordTaskMemory({
      workspaceId,
      spaceId: task.spaceId,
      creatorId: userId,
      action: 'created',
      task,
    });

    try {
      const workspace = await this.workspaceRepo.findById(workspaceId);
      const agentSettings = resolveAgentSettings(workspace?.settings);
      if (agentSettings.enableGoalAutoLink) {
        const text = [task.title, task.description].filter(Boolean).join(' ');
        if (text) {
          const matches = await this.goalService.findMatchingGoals(
            workspaceId,
            task.spaceId,
            text,
          );
          for (const goal of matches) {
            await this.goalService.assignGoal(task.id, goal.id);
          }
        }
      }
    } catch {
      // Goal auto-linking should not block task creation.
    }

    return task;
  }

  async syncTasksFromPageContent(params: {
    workspaceId: string;
    spaceId: string;
    pageId: string;
    userId: string;
    content?: any;
  }) {
    if (!params.content) {
      return { created: 0, skipped: 0 };
    }

    const items = extractTaskItems(params.content);
    if (!items.length) {
      return { created: 0, skipped: 0 };
    }

    const existing = await this.taskRepo.findByPageId(params.pageId);
    const existingTitles = new Set(
      existing.map((task) => task.title.toLowerCase()),
    );

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const key = item.text.toLowerCase();
      if (existingTitles.has(key)) {
        skipped += 1;
        continue;
      }

      await this.create(params.userId, params.workspaceId, {
        title: item.text,
        status: item.checked ? TaskStatus.DONE : TaskStatus.TODO,
        bucket: TaskBucket.NONE,
        spaceId: params.spaceId,
        pageId: params.pageId,
      });
      created += 1;
    }

    return { created, skipped };
  }

  async findByPageId(
    pageId: string,
    options?: {
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeParentTask?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<Task | undefined> {
    const tasks = await this.taskRepo.findByPageId(pageId);
    if (!tasks.length) {
      return undefined;
    }

    const [mostRecent] = tasks
      .slice()
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    if (!mostRecent) {
      return undefined;
    }

    return this.findById(mostRecent.id, options);
  }

  async update(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      bucket?: TaskBucket;
      dueDate?: Date | null;
      assigneeId?: string | null;
      pageId?: string | null;
      estimatedTime?: number | null;
      position?: string;
    },
  ): Promise<Task | undefined> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return undefined;
    }
    const previous = { ...task };

    const updateData: UpdatableTask = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.bucket !== undefined && { bucket: data.bucket }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.pageId !== undefined && { pageId: data.pageId }),
      ...(data.estimatedTime !== undefined && {
        estimatedTime: data.estimatedTime,
      }),
      ...(data.position !== undefined && { position: data.position }),
    };

    // Handle status changes specially to manage completion state
    if (data.status && data.status !== task.status) {
      if (data.status === TaskStatus.DONE) {
        const updated = await this.taskRepo.markCompleted(taskId);
        if (updated) {
          this.recordTaskMemory({
            workspaceId: updated.workspaceId,
            spaceId: updated.spaceId,
            creatorId: updated.creatorId || undefined,
            action: 'completed',
            task: updated,
            changes: { status: [task.status, updated.status] },
          });
        }
        return updated;
      } else if (
        task.status === TaskStatus.DONE &&
        [
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_REVIEW,
          TaskStatus.BLOCKED,
        ].includes(data.status)
      ) {
        const updated = await this.taskRepo.markIncomplete(taskId);
        if (updated) {
          this.recordTaskMemory({
            workspaceId: updated.workspaceId,
            spaceId: updated.spaceId,
            creatorId: updated.creatorId || undefined,
            action: 'reopened',
            task: updated,
            changes: { status: [task.status, updated.status] },
          });
        }
        return updated;
      } else {
        const updated = await this.taskRepo.updateTaskStatus(
          taskId,
          data.status,
        );
        if (updated) {
          this.recordTaskMemory({
            workspaceId: updated.workspaceId,
            spaceId: updated.spaceId,
            creatorId: updated.creatorId || undefined,
            action: 'updated',
            task: updated,
            changes: { status: [task.status, updated.status] },
          });
        }
        return updated;
      }
    }

    const updated = await this.taskRepo.update(taskId, updateData);
    if (updated) {
      const changes: Record<string, [any, any]> = {};
      if (data.title !== undefined && data.title !== previous.title) {
        changes.title = [previous.title, data.title];
      }
      if (data.description !== undefined && data.description !== previous.description) {
        changes.description = [previous.description, data.description];
      }
      if (data.priority !== undefined && data.priority !== previous.priority) {
        changes.priority = [previous.priority, data.priority];
      }
      if (data.bucket !== undefined && data.bucket !== previous.bucket) {
        changes.bucket = [previous.bucket, data.bucket];
      }
      if (data.dueDate !== undefined && data.dueDate !== previous.dueDate) {
        changes.dueDate = [previous.dueDate, data.dueDate];
      }
      if (data.assigneeId !== undefined && data.assigneeId !== previous.assigneeId) {
        changes.assigneeId = [previous.assigneeId, data.assigneeId];
      }
      if (data.pageId !== undefined && data.pageId !== previous.pageId) {
        changes.pageId = [previous.pageId, data.pageId];
      }
      if (data.estimatedTime !== undefined && data.estimatedTime !== previous.estimatedTime) {
        changes.estimatedTime = [previous.estimatedTime, data.estimatedTime];
      }
      if (data.position !== undefined && data.position !== previous.position) {
        changes.position = [previous.position, data.position];
      }

      this.recordTaskMemory({
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        creatorId: updated.creatorId || undefined,
        action: 'updated',
        task: updated,
        changes: Object.keys(changes).length ? changes : undefined,
      });
    }

    return updated;
  }

  async delete(taskId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    await this.taskRepo.softDelete(taskId);

    if (task) {
      this.recordTaskMemory({
        workspaceId: task.workspaceId,
        spaceId: task.spaceId,
        creatorId: task.creatorId || undefined,
        action: 'deleted',
        task,
      });
    }
  }

  async markCompleted(taskId: string): Promise<Task | undefined> {
    const updated = await this.taskRepo.markCompleted(taskId);
    if (updated) {
      this.recordTaskMemory({
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        creatorId: updated.creatorId || undefined,
        action: 'completed',
        task: updated,
      });
    }
    return updated;
  }

  async markIncomplete(taskId: string): Promise<Task | undefined> {
    const updated = await this.taskRepo.markIncomplete(taskId);
    if (updated) {
      this.recordTaskMemory({
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        creatorId: updated.creatorId || undefined,
        action: 'reopened',
        task: updated,
      });
    }
    return updated;
  }

  async assignTask(
    taskId: string,
    assigneeId: string | null,
  ): Promise<Task | undefined> {
    const previous = await this.taskRepo.findById(taskId);
    const updated = await this.taskRepo.update(taskId, { assigneeId });
    if (updated) {
      this.recordTaskMemory({
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        creatorId: updated.creatorId || undefined,
        action: 'assigned',
        task: updated,
        changes: { assigneeId: [previous?.assigneeId || null, assigneeId] },
      });
    }
    return updated;
  }

  async moveToProject(
    taskId: string,
    projectId: string | null,
  ): Promise<Task | undefined> {
    if (projectId === null) {
      const previous = await this.taskRepo.findById(taskId);
      const updated = await this.taskRepo.update(taskId, { projectId: null });
      if (updated) {
        this.recordTaskMemory({
          workspaceId: updated.workspaceId,
          spaceId: updated.spaceId,
          creatorId: updated.creatorId || undefined,
          action: 'moved',
          task: updated,
          changes: { projectId: [previous?.projectId || null, null] },
        });
      }
      return updated;
    }

    // Verify project exists
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Project and task must be in the same space
    if (project.spaceId !== task.spaceId) {
      throw new Error('Project and task must be in the same space');
    }

    const updated = await this.taskRepo.update(taskId, { projectId });
    if (updated) {
      this.recordTaskMemory({
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        creatorId: updated.creatorId || undefined,
        action: 'moved',
        task: updated,
        changes: { projectId: [task.projectId, projectId] },
      });
    }
    return updated;
  }

  private recordTaskMemory(input: {
    workspaceId: string;
    spaceId: string;
    creatorId?: string;
    action: string;
    task: Task;
    changes?: Record<string, [any, any]>;
  }) {
    this.agentMemoryService
      .ingestMemory({
        workspaceId: input.workspaceId,
        spaceId: input.spaceId,
        creatorId: input.creatorId,
        source: `task.${input.action}`,
        summary: `Task ${input.action}: ${input.task.title}`,
        tags: ['task', input.action],
        content: {
          action: input.action,
          taskId: input.task.id,
          title: input.task.title,
          status: input.task.status,
          priority: input.task.priority,
          bucket: input.task.bucket,
          projectId: input.task.projectId || null,
          spaceId: input.task.spaceId,
          changes: input.changes,
        },
      })
      .catch(() => {
        // Memory ingestion should not block task operations.
      });
  }
}
