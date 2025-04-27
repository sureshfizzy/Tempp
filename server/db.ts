import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
}

// Configure WebSocket for Neon connection
neonConfig.webSocketConstructor = ws;

// Disable SSL verification for development environments (for self-signed certificates)
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('Warning: SSL certificate verification disabled in development mode');
  
  // Configure Neon to accept self-signed certificates
  const unsafeAgent = new https.Agent({
    rejectUnauthorized: false
  });
  neonConfig.wsOptions = { agent: unsafeAgent };
  neonConfig.fetchOptions = { agent: unsafeAgent };
}

// Check DATABASE_URL after dotenv has loaded it
if (!process.env.DATABASE_URL) {
  console.error('Environment variables:', Object.keys(process.env).join(', '));
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? " +
    "Make sure you have a .env file with DATABASE_URL=postgresql://user:password@host:port/database"
  );
}

console.log(`Connecting to database using DATABASE_URL (${process.env.DATABASE_URL.substring(0, 25)}...)`);

// Initialize the database connection
let pool: Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;

try {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });
  db = drizzle(pool, { schema });
  console.log('Database pool initialized successfully');
} catch (error) {
  console.error('Error initializing database pool:', error);
  throw error;
}

// Export the pool and db for use in other modules
export { pool, db };