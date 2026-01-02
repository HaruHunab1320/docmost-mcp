import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { AgentLoopService } from './agent-loop.service';
import { resolveAgentSettings } from './agent-settings';
import { WorkspaceRepo } from '@raven-docs/db/repos/workspace/workspace.repo';

@Injectable()
export class AgentLoopSchedulerService {
  private readonly logger = new Logger(AgentLoopSchedulerService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly agentLoopService: AgentLoopService,
    private readonly workspaceRepo: WorkspaceRepo,
  ) {}

  private getZonedParts(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      weekday: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value || '';
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      year: Number(get('year')),
      month: Number(get('month')),
      day: Number(get('day')),
      hour: Number(get('hour')),
      weekday: weekdayMap[get('weekday')] ?? 0,
    };
  }

  private isSameDayInZone(a?: string, b?: Date, timeZone?: string) {
    if (!a || !b || !timeZone) return false;
    const date = new Date(a);
    const left = this.getZonedParts(date, timeZone);
    const right = this.getZonedParts(b, timeZone);
    return (
      left.year === right.year &&
      left.month === right.month &&
      left.day === right.day
    );
  }

  private shouldRunDaily(now: Date, schedule: any, timeZone: string) {
    if (!schedule.dailyEnabled) return false;
    const parts = this.getZonedParts(now, timeZone);
    if (parts.hour !== schedule.dailyHour) return false;
    return !this.isSameDayInZone(schedule.lastDailyRun, now, timeZone);
  }

  private shouldRunWeekly(now: Date, schedule: any, timeZone: string) {
    if (!schedule.weeklyEnabled) return false;
    const parts = this.getZonedParts(now, timeZone);
    if (parts.weekday !== schedule.weeklyDay) return false;
    if (parts.hour !== schedule.dailyHour) return false;
    return !this.isSameDayInZone(schedule.lastWeeklyRun, now, timeZone);
  }

  private shouldRunMonthly(now: Date, schedule: any, timeZone: string) {
    if (!schedule.monthlyEnabled) return false;
    const parts = this.getZonedParts(now, timeZone);
    if (parts.day !== schedule.monthlyDay) return false;
    if (parts.hour !== schedule.dailyHour) return false;
    return !this.isSameDayInZone(schedule.lastMonthlyRun, now, timeZone);
  }

  private async getWorkspaceOwner(workspaceId: string) {
    return this.db
      .selectFrom('users')
      .select(['id', 'email', 'role', 'workspaceId'])
      .where('workspaceId', '=', workspaceId)
      .where('role', '=', 'owner')
      .executeTakeFirst();
  }

  @Cron('0 * * * *')
  async runCadenceChecks() {
    const now = new Date();
    const spaces = await this.db
      .selectFrom('spaces')
      .innerJoin('workspaces', 'workspaces.id', 'spaces.workspaceId')
      .select([
        'spaces.id as spaceId',
        'spaces.workspaceId as workspaceId',
        'workspaces.settings as settings',
      ])
      .execute();

    for (const space of spaces) {
      const settings = resolveAgentSettings(space.settings);
      if (!settings.enabled || !settings.enableAutonomousLoop) {
        continue;
      }

      const override = settings.spaceOverrides?.[space.spaceId];
      const schedule = {
        ...settings.autonomySchedule,
        ...(override?.autonomySchedule || {}),
      };
      const timeZone = schedule.timezone || 'UTC';
      const shouldRun =
        this.shouldRunDaily(now, schedule, timeZone) ||
        this.shouldRunWeekly(now, schedule, timeZone) ||
        this.shouldRunMonthly(now, schedule, timeZone);

      if (!shouldRun) {
        continue;
      }

      const workspace = await this.workspaceRepo.findById(space.workspaceId);
      if (!workspace) {
        continue;
      }

      const owner = await this.getWorkspaceOwner(space.workspaceId);
      if (!owner) {
        this.logger.warn(
          `Autonomy skipped for space ${space.spaceId}: no owner user found.`,
        );
        continue;
      }

      try {
        await this.agentLoopService.runLoop(
          space.spaceId,
          owner as any,
          workspace,
        );

        const updates: Record<string, string> = {};
        if (this.shouldRunDaily(now, schedule, timeZone)) {
          updates.lastDailyRun = now.toISOString();
        }
        if (this.shouldRunWeekly(now, schedule, timeZone)) {
          updates.lastWeeklyRun = now.toISOString();
        }
        if (this.shouldRunMonthly(now, schedule, timeZone)) {
          updates.lastMonthlyRun = now.toISOString();
        }

        if (override?.autonomySchedule) {
          await this.workspaceRepo.updateAgentSettings(workspace.id, {
            spaceOverrides: {
              ...settings.spaceOverrides,
              [space.spaceId]: {
                autonomySchedule: {
                  ...schedule,
                  ...updates,
                },
              },
            },
          });
        } else {
          await this.workspaceRepo.updateAgentSettings(workspace.id, {
            autonomySchedule: {
              ...schedule,
              ...updates,
            },
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Autonomy run failed for space ${space.spaceId}: ${error?.message || String(error)}`,
        );
      }
    }
  }

  async runManual(workspaceId: string, user: any) {
    const now = new Date();
    const spaces = await this.db
      .selectFrom('spaces')
      .innerJoin('workspaces', 'workspaces.id', 'spaces.workspaceId')
      .select([
        'spaces.id as spaceId',
        'spaces.workspaceId as workspaceId',
        'workspaces.settings as settings',
      ])
      .where('spaces.workspaceId', '=', workspaceId)
      .execute();

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      return { ran: 0 };
    }

    let ran = 0;
    for (const space of spaces) {
      const settings = resolveAgentSettings(space.settings);
      if (!settings.enabled || !settings.enableAutonomousLoop) {
        continue;
      }

      try {
        await this.agentLoopService.runLoop(space.spaceId, user, workspace);
        ran += 1;
      } catch (error: any) {
        this.logger.warn(
          `Manual autonomy run failed for space ${space.spaceId}: ${error?.message || String(error)}`,
        );
      }
    }

    if (ran > 0) {
      await this.workspaceRepo.updateAgentSettings(workspace.id, {
        autonomySchedule: {
          ...resolveAgentSettings(workspace.settings).autonomySchedule,
          lastDailyRun: now.toISOString(),
          lastWeeklyRun: now.toISOString(),
          lastMonthlyRun: now.toISOString(),
        },
      });
    }

    return { ran };
  }
}
