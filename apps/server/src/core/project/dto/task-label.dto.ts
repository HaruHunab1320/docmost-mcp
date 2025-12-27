import { IsOptional, IsString } from 'class-validator';

export class ListTaskLabelsDto {
  @IsString()
  workspaceId: string;
}

export class CreateTaskLabelDto {
  @IsString()
  workspaceId: string;

  @IsString()
  name: string;

  @IsString()
  color: string;
}

export class UpdateTaskLabelDto {
  @IsString()
  labelId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class DeleteTaskLabelDto {
  @IsString()
  labelId: string;
}

export class AssignTaskLabelDto {
  @IsString()
  taskId: string;

  @IsString()
  labelId: string;
}

export class RemoveTaskLabelDto {
  @IsString()
  taskId: string;

  @IsString()
  labelId: string;
}
