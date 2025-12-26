import { IsBoolean, IsOptional } from 'class-validator';

export class AgentSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDailySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAutoTriage?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMemoryAutoIngest?: boolean;

  @IsOptional()
  @IsBoolean()
  enableGoalAutoLink?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePlannerLoop?: boolean;

  @IsOptional()
  @IsBoolean()
  enableProactiveQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAutonomousLoop?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMemoryInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAgentChat?: boolean;

  @IsOptional()
  @IsBoolean()
  allowTaskWrites?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPageWrites?: boolean;

  @IsOptional()
  @IsBoolean()
  allowProjectWrites?: boolean;

  @IsOptional()
  @IsBoolean()
  allowGoalWrites?: boolean;
}
