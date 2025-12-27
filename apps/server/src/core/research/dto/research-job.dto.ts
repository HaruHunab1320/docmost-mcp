import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResearchRepoTargetDto {
  @IsOptional()
  @IsString()
  host?: string;

  @IsString()
  owner: string;

  @IsString()
  repo: string;

  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  paths?: string[];
}

export class ResearchSourcesDto {
  @IsOptional()
  @IsBoolean()
  docs?: boolean;

  @IsOptional()
  @IsBoolean()
  web?: boolean;

  @IsOptional()
  @IsBoolean()
  repo?: boolean;
}

export class CreateResearchJobDto {
  @IsUUID()
  spaceId: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  timeBudgetMinutes?: number;

  @IsOptional()
  @IsIn(['longform', 'brief'])
  outputMode?: 'longform' | 'brief';

  @IsOptional()
  @ValidateNested()
  @Type(() => ResearchSourcesDto)
  sources?: ResearchSourcesDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResearchRepoTargetDto)
  repoTargets?: ResearchRepoTargetDto[];
}

export class ResearchJobQueryDto {
  @IsUUID()
  spaceId: string;
}

export class ResearchJobInfoDto {
  @IsUUID()
  jobId: string;
}
