import * as schema from "@shared/schema";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Setup WebSocket for PostgreSQL
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and not empty
const isDatabaseUrlSet = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';

// Use PostgreSQL if DATABASE_URL is set, otherwise we'll use SQLite in other modules
if (!isDatabaseUrlSet) {
  console.log("DATABASE_URL not set or empty - will use SQLite database");
}

// Initialize PostgreSQL connection if DATABASE_URL is set
export const pool = isDatabaseUrlSet 
  ? new Pool({ connectionString: process.env.DATABASE_URL as string }) 
  : null;

// Export db object for PostgreSQL
export const db = pool ? drizzle(pool, { schema }) : null;