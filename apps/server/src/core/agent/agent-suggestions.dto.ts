import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class AgentSuggestionsDto {
  @IsString()
  spaceId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}
