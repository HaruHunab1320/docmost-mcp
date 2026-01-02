import { Injectable, Logger } from '@nestjs/common';
import { RepoBrowseService } from '../../repo/repo-browse.service';
import { createInvalidParamsError, createInternalError } from '../utils/error.utils';
import { WorkspaceRepo } from '../../../database/repos/workspace/workspace.repo';
import { User } from '@raven-docs/db/types/entity.types';

@Injectable()
export class RepoHandler {
  private readonly logger = new Logger(RepoHandler.name);

  constructor(
    private readonly repoBrowse: RepoBrowseService,
    private readonly workspaceRepo: WorkspaceRepo,
  ) {}

  async listTree(params: any, user: User) {
    this.logger.debug(`Processing repo.listTree for user ${user.id}`);

    const owner = params?.owner;
    const repo = params?.repo;
    if (!owner || !repo) {
      throw createInvalidParamsError('owner and repo are required');
    }

    try {
      const workspace = await this.workspaceRepo.findById(user.workspaceId);
      const integrationSettings = (workspace?.settings as any)?.integrations;
      const tokens = {
        github:
          integrationSettings?.repoTokens?.githubToken ||
          process.env.GITHUB_TOKEN ||
          process.env.GITHUB_API_TOKEN,
        gitlab:
          integrationSettings?.repoTokens?.gitlabToken ||
          process.env.GITLAB_TOKEN,
        bitbucket:
          integrationSettings?.repoTokens?.bitbucketToken ||
          process.env.BITBUCKET_TOKEN,
      };

      return await this.repoBrowse.listTree({
        host: params?.host,
        owner,
        repo,
        ref: params?.ref,
        path: params?.path,
        tokens,
      });
    } catch (error: any) {
      this.logger.error(
        `Error listing repo tree: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw createInternalError(
        error?.message || 'Failed to list repo tree',
      );
    }
  }

  async readFile(params: any, user: User) {
    this.logger.debug(`Processing repo.readFile for user ${user.id}`);

    const owner = params?.owner;
    const repo = params?.repo;
    const path = params?.path;
    if (!owner || !repo || !path) {
      throw createInvalidParamsError('owner, repo, and path are required');
    }

    try {
      const workspace = await this.workspaceRepo.findById(user.workspaceId);
      const integrationSettings = (workspace?.settings as any)?.integrations;
      const tokens = {
        github:
          integrationSettings?.repoTokens?.githubToken ||
          process.env.GITHUB_TOKEN ||
          process.env.GITHUB_API_TOKEN,
        gitlab:
          integrationSettings?.repoTokens?.gitlabToken ||
          process.env.GITLAB_TOKEN,
        bitbucket:
          integrationSettings?.repoTokens?.bitbucketToken ||
          process.env.BITBUCKET_TOKEN,
      };

      return await this.repoBrowse.readFile({
        host: params?.host,
        owner,
        repo,
        ref: params?.ref,
        path,
        maxBytes: params?.maxBytes,
        tokens,
      });
    } catch (error: any) {
      this.logger.error(
        `Error reading repo file: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw createInternalError(
        error?.message || 'Failed to read repo file',
      );
    }
  }
}
