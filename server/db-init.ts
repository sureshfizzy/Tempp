import { pool, db } from './db';
import { sql } from 'drizzle-orm';
import { serverConfig, jellyfinCredentials, appUsers, sessions } from '@shared/schema';

/**
 * Initialize database tables if they don't exist
 */
export async function initializeDatabase() {
  try {
    console.log('Checking database tables...');
    
    // Create server_config table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS server_config (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log('server_config table created or already exists.');
    
    // Create app_users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE NOT NULL,
        jellyfin_user_id TEXT NOT NULL,
        plex_email TEXT,
        emby_email TEXT,
        paypal_email TEXT,
        discord_username TEXT,
        discord_id TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(username),
        UNIQUE(email)
      )
    `);
    console.log('app_users table created or already exists.');
    
    // Create jellyfin_credentials table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS jellyfin_credentials (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        admin_username TEXT NOT NULL,
        admin_password TEXT NOT NULL,
        access_token TEXT,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log('jellyfin_credentials table created or already exists.');
    
    // Create session table for connect-pg-simple
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);
    console.log('session table created or already exists.');
    
    console.log('All database tables are ready!');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}