import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PageRepo } from '../../database/repos/page/page.repo';
import { WorkspaceRepo } from '@raven-docs/db/repos/workspace/workspace.repo';
import { AgentMemoryService } from '../../core/agent-memory/agent-memory.service';
import { resolveAgentSettings } from '../../core/agent/agent-settings';

interface CollabPageChangedEvent {
  pageId: string;
  userId: string;
  timestamp: number;
}

interface CollabBuffer {
  pageId: string;
  userId: string;
  count: number;
  firstAt: number;
  lastAt: number;
  timer?: NodeJS.Timeout;
}

const DEBOUNCE_MS = 2 * 60 * 1000;

@Injectable()
export class CollabActivityListener {
  private readonly logger = new Logger(CollabActivityListener.name);
  private readonly buffer = new Map<string, CollabBuffer>();

  constructor(
    private readonly pageRepo: PageRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly agentMemoryService: AgentMemoryService,
  ) {}

  @OnEvent('collab.page.changed')
  handlePageChanged(event: CollabPageChangedEvent) {
    const key = `${event.pageId}:${event.userId}`;
    const existing = this.buffer.get(key);

    if (existing) {
      existing.count += 1;
      existing.lastAt = event.timestamp;
      if (existing.timer) {
        clearTimeout(existing.timer);
      }
      existing.timer = setTimeout(() => {
        this.flushBuffer(key).catch(() => undefined);
      }, DEBOUNCE_MS);
    } else {
      const entry: CollabBuffer = {
        pageId: event.pageId,
        userId: event.userId,
        count: 1,
        firstAt: event.timestamp,
        lastAt: event.timestamp,
      };
      entry.timer = setTimeout(() => {
        this.flushBuffer(key).catch(() => undefined);
      }, DEBOUNCE_MS);
      this.buffer.set(key, entry);
    }
  }

  private async flushBuffer(key: string) {
    const entry = this.buffer.get(key);
    if (!entry) return;
    this.buffer.delete(key);

    const page = await this.pageRepo.findById(entry.pageId);
    if (!page) return;

    const workspace = await this.workspaceRepo.findById(page.workspaceId);
    const agentSettings = resolveAgentSettings(workspace?.settings);
    if (!agentSettings.enabled || !agentSettings.enableMemoryAutoIngest) {
      return;
    }

    const durationMs = Math.max(1, entry.lastAt - entry.firstAt);
    const summary = `Editing session: ${page.title}`;

    try {
      await this.agentMemoryService.ingestMemory({
        workspaceId: page.workspaceId,
        spaceId: page.spaceId,
        creatorId: entry.userId,
        source: 'collab.edit.session',
        summary,
        tags: ['page', 'collab', 'activity'],
        content: {
          action: 'collab-edit',
          pageId: page.id,
          title: page.title,
          userId: entry.userId,
          changeCount: entry.count,
          durationMs,
          startedAt: new Date(entry.firstAt).toISOString(),
          endedAt: new Date(entry.lastAt).toISOString(),
        },
      });
    } catch (error: any) {
      this.logger.debug(
        `Failed to ingest collab activity for page ${page.id}: ${error?.message || String(error)}`,
      );
    }
  }
}
