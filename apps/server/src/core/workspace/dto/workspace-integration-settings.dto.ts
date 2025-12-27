import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class RepoTokensDto {
  @IsOptional()
  @IsString()
  githubToken?: string;

  @IsOptional()
  @IsString()
  gitlabToken?: string;

  @IsOptional()
  @IsString()
  bitbucketToken?: string;
}

export class WorkspaceIntegrationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => RepoTokensDto)
  repoTokens?: RepoTokensDto;
}
