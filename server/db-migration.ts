import { pool, db } from "./db";
import { serverConfig, userProfiles, invites } from "@shared/schema";
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

    // Create user_profiles table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        source_user_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        library_access TEXT DEFAULT '[]',
        home_layout TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log('user_profiles table created or already exists.');
    
    // Create invites table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        label TEXT,
        user_label TEXT,
        profile_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
        max_uses INTEGER DEFAULT 1 NOT NULL,
        uses_remaining INTEGER DEFAULT 1 NOT NULL,
        expires_at TIMESTAMP,
        user_expiry_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        user_expiry_months INTEGER DEFAULT 0,
        user_expiry_days INTEGER DEFAULT 0,
        user_expiry_hours INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by INTEGER REFERENCES app_users(id)
      )
    `);
    console.log('invites table created or already exists.');
    
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