import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
}

neonConfig.webSocketConstructor = ws;

// Check DATABASE_URL after dotenv has loaded it
if (!process.env.DATABASE_URL) {
  console.error('Environment variables:', Object.keys(process.env).join(', '));
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? " +
    "Make sure you have a .env file with DATABASE_URL=postgresql://user:password@host:port/database"
  );
}

console.log(`Connecting to database using DATABASE_URL (${process.env.DATABASE_URL.substring(0, 25)}...)`);
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });