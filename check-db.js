import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

console.log("====================================================");
console.log("Jellyfin User Manager - Database Connection Checker");
console.log("====================================================\n");

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`Error: .env file not found at ${envPath}`);
  process.exit(1);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error("Make sure your .env file contains a line like:");
  console.error("DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jellyfin_manager");
  process.exit(1);
}

console.log(`Found DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 20)}...`);

// Try to connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log("Attempting to connect to the database...");

(async () => {
  try {
    // Try a simple query
    const result = await pool.query('SELECT NOW()');
    console.log("✅ Success! Connected to the database.");
    console.log(`Server time: ${result.rows[0].now}`);
    
    // Check for existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log("\nExisting tables in the database:");
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    } else {
      console.log("\nNo tables found in the database. This appears to be a new database.");
    }
    
    console.log("\n====================================================");
    console.log("Your database connection is working correctly!");
    console.log("\nTo start the application, run:");
    console.log("  ./start-dev.sh");
    console.log("====================================================");
  } catch (error) {
    console.error("\n❌ Error connecting to the database:");
    console.error(error.message);
    console.error("\nPossible causes:");
    console.error("1. The database server is not running");
    console.error("2. The connection credentials are incorrect");
    console.error("3. The database does not exist");
    console.error("4. There's a network issue preventing the connection");
    
    console.log("\nTo troubleshoot:");
    console.log("1. Check if PostgreSQL is running");
    console.log("2. Verify the DATABASE_URL in your .env file");
    console.log("3. Try creating the database manually with:");
    console.log("   createdb jellyfin_manager   (or whatever name you specified)");
    
    process.exit(1);
  } finally {
    await pool.end();
  }
})();