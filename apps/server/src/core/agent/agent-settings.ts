export interface AgentSettings {
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
}

export const defaultAgentSettings: AgentSettings = {
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
};

export const resolveAgentSettings = (
  settings?: any,
): AgentSettings => ({
  ...defaultAgentSettings,
  ...(settings?.agent || {}),
});
