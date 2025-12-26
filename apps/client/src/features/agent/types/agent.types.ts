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
      autonomySchedule?: {
        dailyEnabled?: boolean;
        dailyHour?: number;
        weeklyEnabled?: boolean;
        weeklyDay?: number;
        monthlyEnabled?: boolean;
        monthlyDay?: number;
        timezone?: string;
        lastDailyRun?: string;
        lastWeeklyRun?: string;
        lastMonthlyRun?: string;
      };
    }
  >;
}

export interface AgentChatResponse {
  reply: string;
}
