export interface AgentSettings {
  policy?: {
    allowAutoApply?: string[];
    requireApproval?: string[];
    deny?: string[];
  };
  enabled: boolean;
  enableDailySummary: boolean;
  enableAutoTriage: boolean;
  enableMemoryAutoIngest: boolean;
  enableGoalAutoLink: boolean;
  enablePlannerLoop: boolean;
  enableProactiveQuestions: boolean;
  enableAutonomousLoop: boolean;
  enableMemoryInsights: boolean;
  allowAgentChat: boolean;
  allowTaskWrites: boolean;
  allowPageWrites: boolean;
  allowProjectWrites: boolean;
  allowGoalWrites: boolean;
  autonomySchedule: {
    dailyEnabled: boolean;
    dailyHour: number;
    weeklyEnabled: boolean;
    weeklyDay: number;
    monthlyEnabled: boolean;
    monthlyDay: number;
    timezone: string;
    lastDailyRun?: string;
    lastWeeklyRun?: string;
    lastMonthlyRun?: string;
  };
  spaceOverrides?: Record<
    string,
    {
      autonomySchedule?: Partial<AgentSettings['autonomySchedule']>;
    }
  >;
}

export const defaultAgentSettings: AgentSettings = {
  policy: {
    allowAutoApply: [],
    requireApproval: [],
    deny: [],
  },
  enabled: true,
  enableDailySummary: true,
  enableAutoTriage: true,
  enableMemoryAutoIngest: true,
  enableGoalAutoLink: true,
  enablePlannerLoop: true,
  enableProactiveQuestions: true,
  enableAutonomousLoop: false,
  enableMemoryInsights: true,
  allowAgentChat: true,
  allowTaskWrites: false,
  allowPageWrites: false,
  allowProjectWrites: false,
  allowGoalWrites: false,
  autonomySchedule: {
    dailyEnabled: true,
    dailyHour: 7,
    weeklyEnabled: true,
    weeklyDay: 1,
    monthlyEnabled: true,
    monthlyDay: 1,
    timezone: 'UTC',
    lastDailyRun: undefined,
    lastWeeklyRun: undefined,
    lastMonthlyRun: undefined,
  },
  spaceOverrides: {},
};

export const resolveAgentSettings = (
  settings?: any,
): AgentSettings => ({
  ...defaultAgentSettings,
  ...(settings?.agent || {}),
  policy: {
    ...defaultAgentSettings.policy,
    ...(settings?.agent?.policy || {}),
  },
  autonomySchedule: {
    ...defaultAgentSettings.autonomySchedule,
    ...(settings?.agent?.autonomySchedule || {}),
  },
  spaceOverrides: settings?.agent?.spaceOverrides || {},
});
