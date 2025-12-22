import { IsString } from 'class-validator';

export class AttachmentIdDto {
  @IsString()
  attachmentId: string;
}
