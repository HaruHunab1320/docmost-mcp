import { Module } from '@nestjs/common';
import { Kysely, PostgresDialect, CamelCasePlugin } from 'kysely';
import { Pool } from 'pg';
import { DB } from './types/db';
import { ProjectRepo } from './repos/project/project.repo';
import { SpaceRepo } from './repos/space/space.repo';
import { TaskRepo } from './repos/task/task.repo';
import { TaskLabelRepo } from './repos/task/task-label.repo';
import { KYSELY } from '../lib/kysely/nestjs-kysely';
import { SpaceMemberRepo } from './repos/space/space-member.repo';
import { GroupRepo } from './repos/group/group.repo';
import { GroupUserRepo } from './repos/group/group-user.repo';
import { BacklinkRepo } from './repos/backlink/backlink.repo';
import { PageRepo } from './repos/page/page.repo';
import { AttachmentRepo } from './repos/attachment/attachment.repo';
import { PageHistoryRepo } from './repos/page/page-history.repo';
import { CommentRepo } from './repos/comment/comment.repo';
import { UserRepo } from './repos/user/user.repo';
import { MCPApiKeyRepo } from './repos/mcp-api-key/mcp-api-key.repo';
import { WorkspaceRepo } from './repos/workspace/workspace.repo';
import { UserTokenRepo } from './repos/user-token/user-token.repo';
import { MigrationService } from './services/migration.service';

@Module({
  providers: [
    {
      provide: KYSELY,
      useFactory: () => {
        const dialect = new PostgresDialect({
          pool: new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'raven-docs',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
          }),
        });

        return new Kysely<DB>({
          dialect,
          plugins: [new CamelCasePlugin()],
        });
      },
    },
    ProjectRepo,
    SpaceRepo,
    TaskRepo,
    TaskLabelRepo,
    SpaceMemberRepo,
    GroupRepo,
    GroupUserRepo,
    BacklinkRepo,
    PageRepo,
    AttachmentRepo,
    PageHistoryRepo,
    CommentRepo,
    UserRepo,
    MCPApiKeyRepo,
    WorkspaceRepo,
    UserTokenRepo,
    MigrationService,
  ],
  exports: [
    KYSELY,
    ProjectRepo,
    SpaceRepo,
    TaskRepo,
    TaskLabelRepo,
    SpaceMemberRepo,
    GroupRepo,
    GroupUserRepo,
    BacklinkRepo,
    PageRepo,
    AttachmentRepo,
    PageHistoryRepo,
    CommentRepo,
    UserRepo,
    MCPApiKeyRepo,
    WorkspaceRepo,
    UserTokenRepo,
    MigrationService,
  ],
})
export class DatabaseModule {}
