import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AgentChatDto {
  @IsUUID()
  spaceId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  pageId?: string;
}
