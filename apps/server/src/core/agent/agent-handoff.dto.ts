import { IsOptional, IsString } from 'class-validator';

export class AgentHandoffDto {
  @IsOptional()
  @IsString()
  name?: string;
}
