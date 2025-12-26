import { IsUUID } from 'class-validator';

export class AgentLoopDto {
  @IsUUID()
  spaceId: string;
}
