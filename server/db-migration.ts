import { pool, db } from "./db";
import { serverConfig } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Run database migrations that can't be handled by Drizzle-kit
 */
export async function runCustomMigrations() {
  try {
    console.log("Running custom migrations...");
    
    // Add new columns to server_config table
    await db.execute(sql`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE server_config 
          ADD COLUMN IF NOT EXISTS server_name TEXT DEFAULT 'Jellyfin Server',
          ADD COLUMN IF NOT EXISTS logo_url TEXT,
          ADD COLUMN IF NOT EXISTS features_json TEXT DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS invite_duration INTEGER DEFAULT 24;
        EXCEPTION
          WHEN duplicate_column THEN
            RAISE NOTICE 'columns already exist in server_config';
        END;
      END
      $$;
    `);
    
    console.log("Custom migrations completed successfully.");
  } catch (error) {
    console.error("Error running custom migrations:", error);
    throw error;
  }
}

// Run migrations if this file is executed directly
// Using ES modules approach instead of CommonJS
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await runCustomMigrations();
      console.log("Migration completed successfully.");
      process.exit(0);
    } catch (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  })();
}