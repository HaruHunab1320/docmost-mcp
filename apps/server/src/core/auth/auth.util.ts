import { BadRequestException } from '@nestjs/common';
import { Workspace } from '@raven-docs/db/types/entity.types';

export function validateSsoEnforcement(workspace: Workspace) {
  if (workspace.enforceSso) {
    throw new BadRequestException('This workspace has enforced SSO login.');
  }
}
