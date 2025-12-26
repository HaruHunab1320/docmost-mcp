import { IsUUID } from 'class-validator';

export class AgentPlanDto {
  @IsUUID()
  spaceId: string;
}
