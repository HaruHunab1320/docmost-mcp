import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { CreateResearchJobDto } from './dto/research-job.dto';
import { QueueJob, QueueName } from '../../integrations/queue/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEFAULT_TIME_BUDGET_MINUTES, MAX_DOC_RESULTS, MAX_REPO_FILES, MAX_WEB_RESULTS } from './research.constants';
import { SearchService } from '../search/search.service';
import { RepoBrowseService } from '../../integrations/repo/repo-browse.service';
import { WebSearchService } from './web-search.service';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';
import { AIService } from '../../integrations/ai/ai.service';
import { sql } from 'kysely';
import { PageRepo } from '@raven-docs/db/repos/page/page.repo';
import { PageService } from '../page/services/page.service';
import { WorkspaceRepo } from '@raven-docs/db/repos/workspace/workspace.repo';

type ResearchJobRecord = {
  id: string;
  workspaceId: string;
  spaceId: string;
  topic: string;
  goal?: string | null;
  status: string;
  timeBudgetMinutes: number;
  outputMode: string;
  sources: any;
  repoTargets: any;
  reportPageId?: string | null;
  logPageId?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

type ResearchLogEntry = {
  timestamp: string;
  message: string;
};

const parseJson = <T>(value: any, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const buildDocParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph }],
    }));

@Injectable()
export class ResearchJobService {
  private readonly logger = new Logger(ResearchJobService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    @InjectQueue(QueueName.GENERAL_QUEUE) private readonly generalQueue: Queue,
    private readonly searchService: SearchService,
    private readonly repoBrowse: RepoBrowseService,
    private readonly webSearch: WebSearchService,
    private readonly pageRepo: PageRepo,
    private readonly pageService: PageService,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly memoryService: AgentMemoryService,
    private readonly aiService: AIService,
  ) {}

  async createJob(input: CreateResearchJobDto, userId: string, workspaceId: string) {
    const job = await this.db
      .insertInto('researchJobs')
      .values({
        workspaceId,
        spaceId: input.spaceId,
        creatorId: userId,
        topic: input.topic,
        goal: input.goal || null,
        status: 'queued',
        timeBudgetMinutes: input.timeBudgetMinutes || DEFAULT_TIME_BUDGET_MINUTES,
        outputMode: input.outputMode || 'longform',
        sources: input.sources ? sql`${JSON.stringify(input.sources)}::jsonb` : null,
        repoTargets: input.repoTargets
          ? (sql`${JSON.stringify(input.repoTargets)}::jsonb` as any)
          : null,
      })
      .returning([
        'id',
        'workspaceId',
        'spaceId',
        'topic',
        'goal',
        'status',
        'timeBudgetMinutes',
        'outputMode',
        'sources',
        'repoTargets',
        'createdAt',
      ])
      .executeTakeFirst();

    if (!job) {
      throw new Error('Failed to create research job');
    }

    await this.generalQueue.add(QueueJob.RESEARCH_JOB, { jobId: job.id });
    return job;
  }

  async listJobs(spaceId: string, workspaceId: string) {
    return this.db
      .selectFrom('researchJobs')
      .select([
        'id',
        'topic',
        'goal',
        'status',
        'timeBudgetMinutes',
        'outputMode',
        'createdAt',
        'startedAt',
        'completedAt',
        'reportPageId',
        'logPageId',
      ])
      .where('workspaceId', '=', workspaceId)
      .where('spaceId', '=', spaceId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async getJob(jobId: string, workspaceId: string) {
    return this.db
      .selectFrom('researchJobs')
      .selectAll()
      .where('id', '=', jobId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async runJob(jobId: string) {
    const job = await this.db
      .selectFrom('researchJobs')
      .selectAll()
      .where('id', '=', jobId)
      .executeTakeFirst();

    if (!job) {
      this.logger.warn(`Research job ${jobId} not found`);
      return;
    }

    if (job.status === 'running') {
      this.logger.warn(`Research job ${jobId} already running`);
      return;
    }

    if (!job.creatorId) {
      this.logger.warn(`Research job ${jobId} has no creatorId`);
      await this.db
        .updateTable('researchJobs')
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where('id', '=', jobId)
        .execute();
      return;
    }

    const logEntries: ResearchLogEntry[] = [];
    const log = (message: string) => {
      logEntries.push({
        timestamp: new Date().toISOString(),
        message,
      });
    };

    try {
      const sources = parseJson(job.sources, {
        docs: true,
        web: true,
        repo: true,
      });

      log('Research job started.');
      await this.db
        .updateTable('researchJobs')
        .set({
          status: 'running',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where('id', '=', jobId)
        .execute();

      const logPageId =
        job.logPageId ||
        (await this.createLogPage(job as ResearchJobRecord, job.creatorId));
      const reportPageId =
        job.reportPageId ||
        (await this.createReportPage(job as ResearchJobRecord, job.creatorId));

      await this.db
        .updateTable('researchJobs')
        .set({
          logPageId,
          reportPageId,
        })
        .where('id', '=', jobId)
        .execute();

      const docSources: Array<{ title: string; excerpt: string }> = [];
      if (sources.docs) {
        log('Collecting internal documents.');
        const results = await this.searchService.searchPage(job.topic, {
          query: job.topic,
          spaceId: job.spaceId,
          limit: MAX_DOC_RESULTS,
        });
        if (results.length) {
          const pageIds = results.map((result) => result.id);
          const pages = await this.db
            .selectFrom('pages')
            .select(['id', 'title', 'textContent'])
            .where('id', 'in', pageIds)
            .execute();
          const pageMap = new Map(pages.map((page) => [page.id, page]));
          results.forEach((result) => {
            const page = pageMap.get(result.id);
            const excerpt = page?.textContent || result.highlight || '';
            if (excerpt) {
              docSources.push({
                title: page?.title || result.title || 'Untitled',
                excerpt: excerpt.slice(0, 1200),
              });
            }
          });
        }
        log(`Found ${docSources.length} relevant docs.`);
      }

      const webSources: Array<{
        title: string;
        url: string;
        snippet: string;
      }> = [];
      if (sources.web) {
        try {
          log('Searching the web.');
          const results = await this.webSearch.search(
            job.topic,
            MAX_WEB_RESULTS,
          );
          for (const result of results) {
            const snippet = result.snippet || '';
            webSources.push({
              title: result.title,
              url: result.url,
              snippet,
            });
          }
          log(`Collected ${webSources.length} web results.`);
        } catch (error: any) {
          log(`Web search failed: ${error?.message || 'unknown error'}`);
        }
      }

      const repoTargets = parseJson(job.repoTargets, []);
      const workspace = await this.workspaceRepo.findById(job.workspaceId);
      const integrationSettings = (workspace?.settings as any)?.integrations;
      const repoTokens = {
        github:
          integrationSettings?.repoTokens?.githubToken ||
          process.env.GITHUB_TOKEN ||
          process.env.GITHUB_API_TOKEN,
        gitlab:
          integrationSettings?.repoTokens?.gitlabToken ||
          process.env.GITLAB_TOKEN,
        bitbucket:
          integrationSettings?.repoTokens?.bitbucketToken ||
          process.env.BITBUCKET_TOKEN,
      };
      const repoFindings: Array<{ repo: string; notes: string }> = [];
      if (sources.repo && Array.isArray(repoTargets) && repoTargets.length) {
        log('Exploring repository targets.');
        for (const target of repoTargets.slice(0, 3)) {
          try {
            const tree = await this.repoBrowse.listTree({
              host: target.host,
              owner: target.owner,
              repo: target.repo,
              ref: target.ref,
              path: '',
              tokens: repoTokens,
            });
            const files = tree.entries
              .filter((entry) => entry.type === 'file')
              .slice(0, MAX_REPO_FILES);
            const snippets: string[] = [];
            for (const file of files) {
              const content = await this.repoBrowse.readFile({
                host: target.host,
                owner: target.owner,
                repo: target.repo,
                ref: target.ref,
                path: file.path,
                maxBytes: 4000,
                tokens: repoTokens,
              });
              snippets.push(`${file.path}:\n${content.content}`);
            }
            repoFindings.push({
              repo: `${target.owner}/${target.repo}`,
              notes: snippets.join('\n\n').slice(0, 8000),
            });
          } catch (error: any) {
            log(`Repo fetch failed for ${target?.owner}/${target?.repo}`);
          }
        }
      }

      const reportPrompt = [
        `You are Raven Docs' research agent.`,
        `Topic: ${job.topic}`,
        job.goal ? `Goal: ${job.goal}` : null,
        `Time budget: ${job.timeBudgetMinutes} minutes.`,
        `Produce a ${job.outputMode === 'brief' ? 'brief' : 'long-form'} report.`,
        `Include: Summary, Findings, Evidence, Open Questions, Next Steps.`,
        docSources.length
          ? `Internal docs:\n${docSources
              .map((doc) => `- ${doc.title}: ${doc.excerpt}`)
              .join('\n')}`
          : 'Internal docs: none',
        webSources.length
          ? `Web sources:\n${webSources
              .map(
                (source) => `- ${source.title} (${source.url}): ${source.snippet}`,
              )
              .join('\n')}`
          : 'Web sources: none',
        repoFindings.length
          ? `Repo notes:\n${repoFindings
              .map((repo) => `- ${repo.repo}\n${repo.notes}`)
              .join('\n')}`
          : 'Repo notes: none',
      ]
        .filter(Boolean)
        .join('\n\n');

      log('Generating report.');
      let reportText = '';
      try {
        const response = await this.aiService.generateContent({
          model: process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview',
          contents: [{ role: 'user', parts: [{ text: reportPrompt }] }],
        });
        reportText =
          response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (error: any) {
        reportText = `Report generation failed: ${error?.message || 'unknown error'}`;
      }

      const reportDoc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: `Research Report: ${job.topic}` }],
          },
          ...buildDocParagraphs(reportText || 'No report generated.'),
        ],
      };

      await this.pageRepo.updatePage(
        {
          content: JSON.stringify(reportDoc),
        },
        reportPageId,
      );

      await this.pageRepo.updatePage(
        {
          content: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Research Log' }],
              },
              ...logEntries.map((entry) => ({
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `${entry.timestamp} - ${entry.message}`,
                  },
                ],
              })),
            ],
          }),
        },
        logPageId,
      );

      await this.memoryService.ingestMemory({
        workspaceId: job.workspaceId,
        spaceId: job.spaceId,
        source: 'research-job',
        summary: `Research completed: ${job.topic}`,
        content: reportText,
        tags: ['research', 'report'],
      });

      await this.db
        .updateTable('researchJobs')
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where('id', '=', jobId)
        .execute();
    } catch (error: any) {
      this.logger.error(
        `Research job ${jobId} failed: ${error?.message || 'unknown error'}`,
        error?.stack,
      );
      await this.db
        .updateTable('researchJobs')
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where('id', '=', jobId)
        .execute();
    }
  }

  private async createLogPage(
    job: ResearchJobRecord,
    userId: string,
  ): Promise<string> {
    const title = `Research Log ${job.topic}`.slice(0, 80);
    const page = await this.pageService.create(
      userId,
      job.workspaceId,
      {
        title,
        spaceId: job.spaceId,
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Research Log' }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Topic: ${job.topic}`,
                },
              ],
            },
          ],
        }),
      },
    );
    return page.id;
  }

  private async createReportPage(
    job: ResearchJobRecord,
    userId: string,
  ): Promise<string> {
    const title = `Research Report ${job.topic}`.slice(0, 80);
    const page = await this.pageService.create(
      userId,
      job.workspaceId,
      {
        title,
        spaceId: job.spaceId,
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: `Research Report: ${job.topic}` }],
            },
          ],
        }),
      },
    );
    return page.id;
  }
}
