import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AgentChatDto } from './agent-chat.dto';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';
import { TaskService } from '../project/services/task.service';
import { AIService } from '../../integrations/ai/ai.service';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { User, Workspace } from '@raven-docs/db/types/entity.types';
import { resolveAgentSettings } from './agent-settings';
import { SpaceRepo } from '@raven-docs/db/repos/space/space.repo';
import { PageRepo } from '@raven-docs/db/repos/page/page.repo';
import { AgentSuggestionsDto } from './agent-suggestions.dto';
import { TaskBucket, TaskStatus } from '../project/constants/task-enums';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly taskService: TaskService,
    private readonly aiService: AIService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly spaceRepo: SpaceRepo,
    private readonly pageRepo: PageRepo,
  ) {}

  private getAgentModel() {
    return process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview';
  }

  private extractJsonObject(text: string): Record<string, any> | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  async chat(dto: AgentChatDto, user: User, workspace: Workspace) {
    const agentSettings = resolveAgentSettings(workspace.settings);
    if (!agentSettings.enabled || !agentSettings.allowAgentChat) {
      throw new ForbiddenException('Agent chat disabled');
    }

    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException('No access to space');
    }

    const space = await this.spaceRepo.findById(dto.spaceId, workspace.id);
    if (!space) {
      throw new ForbiddenException('Space not found');
    }

    const page = dto.pageId
      ? await this.pageRepo.findById(dto.pageId, { includeSpace: false })
      : null;

    if (page && page.spaceId !== dto.spaceId) {
      throw new ForbiddenException('Page not found in space');
    }

    const triage = agentSettings.enableAutoTriage
      ? await this.taskService.getDailyTriageSummary(dto.spaceId, {
          limit: 5,
          workspaceId: workspace.id,
        })
      : {
          inbox: [],
          waiting: [],
          someday: [],
          overdue: [],
          dueToday: [],
          counts: { inbox: 0, waiting: 0, someday: 0 },
        };

    const chatTag = dto.pageId ? `agent-chat-page:${dto.pageId}` : 'agent-chat';
    const recentMemories = await this.memoryService.queryMemories(
      {
        workspaceId: workspace.id,
        spaceId: dto.spaceId,
        tags: [chatTag],
        limit: 5,
      },
      undefined,
    );

    const memoryContext = recentMemories
      .map((memory) => `- ${memory.summary}`)
      .join('\n');

    const goalFocusSummary = Array.isArray((triage as any).goalFocus)
      ? (triage as any).goalFocus
          .map((goal: any) => `${goal.name}(${goal.taskCount})`)
          .join(', ')
      : '';

    const prompt = [
      `You are Raven Docs' agent. Provide clear, concise guidance.`,
      `Space: ${space.name}`,
      page?.title ? `Page: ${page.title}` : null,
      `Recent memories:`,
      memoryContext || '- none',
      `Triage: inbox=${triage.counts.inbox}, waiting=${triage.counts.waiting}, someday=${triage.counts.someday}.`,
      `Overdue: ${triage.overdue.map((task) => task.title).join(', ') || 'none'}.`,
      `Due today: ${triage.dueToday.map((task) => task.title).join(', ') || 'none'}.`,
      goalFocusSummary ? `Goal focus: ${goalFocusSummary}.` : null,
      `User message: ${dto.message}`,
      `Respond with next steps, optional questions, and suggest time blocks if relevant.`,
    ]
      .filter(Boolean)
      .join('\n');

    let replyText = 'Agent response unavailable.';
    try {
      const response = await this.aiService.generateContent({
        model: this.getAgentModel(),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      replyText =
        response?.candidates?.[0]?.content?.parts?.[0]?.text || replyText;
    } catch (error: any) {
      this.logger.warn(
        `Agent chat failed: ${error?.message || String(error)}`,
      );
    }

    const tags = dto.pageId ? ['agent-chat', chatTag] : ['agent-chat'];

    await this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      source: 'agent-chat',
      summary: `User: ${dto.message.slice(0, 80)}`,
      content: { text: dto.message },
      tags: [...tags, 'user'],
    });

    await this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      source: 'agent-chat',
      summary: `Agent reply`,
      content: { text: replyText },
      tags: [...tags, 'assistant'],
    });

    return {
      reply: replyText,
    };
  }

  async suggestNextActions(
    dto: AgentSuggestionsDto,
    user: User,
    workspace: Workspace,
  ) {
    const agentSettings = resolveAgentSettings(workspace.settings);
    if (!agentSettings.enabled || !agentSettings.allowAgentChat) {
      throw new ForbiddenException('Agent suggestions disabled');
    }

    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException('No access to space');
    }

    const space = await this.spaceRepo.findById(dto.spaceId, workspace.id);
    if (!space) {
      throw new ForbiddenException('Space not found');
    }

    const limit = dto.limit ?? 5;
    const tasksResult = await this.taskService.findBySpaceId(
      dto.spaceId,
      { page: 1, limit: 200 },
      {
        status: [
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_REVIEW,
          TaskStatus.BLOCKED,
        ],
        bucket: [TaskBucket.NONE, TaskBucket.INBOX],
        includeProject: true,
      },
    );

    const tasks = tasksResult?.data || [];
    if (tasks.length === 0) {
      return { items: [] };
    }

    const taskSummaries = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      projectName: task.project_name || null,
      priority: task.priority,
      status: task.status,
      bucket: task.bucket,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt,
    }));

    const prompt = [
      `You are Raven Docs' planning agent.`,
      `Pick up to ${limit} next actions that the user should focus on.`,
      `Only choose from the provided tasks.`,
      `Return JSON with shape: {"suggestions":[{"taskId":"...","reason":"..."}]}.`,
      `Space: ${space.name}`,
      `Tasks: ${JSON.stringify(taskSummaries)}`,
    ].join('\n');

    let suggestions: Array<{ taskId: string; reason?: string }> = [];
    try {
      const response = await this.aiService.generateContent({
        model: this.getAgentModel(),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const reply =
        response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = this.extractJsonObject(reply);
      const items = Array.isArray(parsed?.suggestions)
        ? parsed.suggestions
        : [];
      suggestions = items
        .filter((item: any) => typeof item?.taskId === 'string')
        .slice(0, limit)
        .map((item: any) => ({
          taskId: item.taskId,
          reason: typeof item.reason === 'string' ? item.reason : undefined,
        }));
    } catch (error: any) {
      this.logger.warn(
        `Agent suggestions failed: ${error?.message || String(error)}`,
      );
    }

    if (suggestions.length === 0) {
      suggestions = taskSummaries.slice(0, limit).map((task) => ({
        taskId: task.id,
        reason: 'Top active task',
      }));
    }

    const taskById = new Map<string, any>(
      taskSummaries.map((task) => [task.id, task]),
    );

    const items = suggestions
      .map((suggestion) => {
        const task = taskById.get(suggestion.taskId);
        if (!task) return null;
        return {
          taskId: suggestion.taskId,
          reason: suggestion.reason,
          title: task.title,
          projectName: task.projectName,
          dueDate: task.dueDate,
          updatedAt: task.updatedAt,
        };
      })
      .filter(Boolean);

    await this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      source: 'agent-suggestions',
      summary: `Agent suggested ${items.length} next actions`,
      content: { suggestions: items },
      tags: ['agent', 'next-actions'],
    });

    return { items };
  }
}
