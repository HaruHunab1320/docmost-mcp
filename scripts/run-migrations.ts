import { NestFactory } from "@nestjs/core";
import { DatabaseModule } from "./apps/server/src/database/database.module";
import { MigrationService } from "./apps/server/src/database/services/migration.service";

async function runMigrations() {
  console.log("Starting database migrations...");

  // Create a standalone application with just the database module
  const app = await NestFactory.createApplicationContext(DatabaseModule);

  try {
    // Get the migration service
    const migrationService = app.get(MigrationService);

    // Run migrations
    await migrationService.migrateToLatest();

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runMigrations();
