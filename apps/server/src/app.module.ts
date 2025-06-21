import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { EnvironmentModule } from './integrations/environment/environment.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { WsModule } from './ws/ws.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './integrations/storage/storage.module';
import { MailModule } from './integrations/mail/mail.module';
import { QueueModule } from './integrations/queue/queue.module';
import { StaticModule } from './integrations/static/static.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './integrations/health/health.module';
import { ExportModule } from './integrations/export/export.module';
import { ImportModule } from './integrations/import/import.module';
import { SecurityModule } from './integrations/security/security.module';
import { TelemetryModule } from './integrations/telemetry/telemetry.module';
import { MCPModule } from './integrations/mcp/mcp.module';
import { MCPStandardModule } from './integrations/mcp-standard/mcp-standard.module';
import { LoggerModule } from 'nestjs-pino';

const enterpriseModules = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (require('./ee/ee.module')?.EeModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    enterpriseModules.push(require('./ee/ee.module')?.EeModule);
  }
} catch (err) {
  if (process.env.CLOUD === 'true') {
    console.warn('Failed to load enterprise modules. Exiting program.\n', err);
    process.exit(1);
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    CoreModule,
    DatabaseModule,
    EnvironmentModule,
    CollaborationModule,
    WsModule,
    QueueModule,
    StaticModule,
    HealthModule,
    ImportModule,
    ExportModule,
    MCPModule,
    MCPStandardModule,
    StorageModule.forRootAsync({
      imports: [EnvironmentModule],
    }),
    MailModule.forRootAsync({
      imports: [EnvironmentModule],
    }),
    EventEmitterModule.forRoot(),
    SecurityModule,
    TelemetryModule,
    ...enterpriseModules,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
