import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class GoalCreateDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  @IsOptional()
  spaceId?: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['short', 'mid', 'long'])
  horizon: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class GoalUpdateDto {
  @IsUUID()
  goalId: string;

  @IsUUID()
  workspaceId: string;

  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['short', 'mid', 'long'])
  horizon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class GoalDeleteDto {
  @IsUUID()
  goalId: string;

  @IsUUID()
  workspaceId: string;
}

export class GoalListDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  @IsOptional()
  spaceId?: string;
}

export class GoalAssignDto {
  @IsUUID()
  goalId: string;

  @IsUUID()
  taskId: string;
}

export class GoalTaskListDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  taskId: string;
}

export class GoalTasksListDto {
  @IsUUID()
  workspaceId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  taskIds: string[];
}
