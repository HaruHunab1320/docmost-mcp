import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ExportFormat {
  HTML = 'html',
  Markdown = 'markdown',
  PDF = 'pdf',
}

export class ExportPageDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsString()
  @IsIn(['html', 'markdown', 'pdf'])
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;
}

export class ExportSpaceDto {
  @IsString()
  @IsNotEmpty()
  spaceId: string;

  @IsString()
  @IsIn(['html', 'markdown', 'pdf'])
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeAttachments?: boolean;
}
