import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AgentReviewPromptsDto {
  @IsUUID()
  spaceId: string;

  @IsOptional()
  @IsString()
  weekKey?: string;
}
