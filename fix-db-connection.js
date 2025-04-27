// Simple utility to check if DATABASE_URL is being read correctly
const fs = require('fs');

console.log("Checking database connection setup...");

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.error("ERROR: .env file not found!");
    console.log("Please create an .env file with your database connection string.");
    console.log("Example: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jellyfin_manager");
    process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
console.log("\n.env file content:");
console.log("---------------------------------------");
console.log(envContent);
console.log("---------------------------------------");

// Check for DATABASE_URL
const databaseUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
if (!databaseUrlMatch) {
    console.error("\nERROR: DATABASE_URL not found in .env file!");
    process.exit(1);
}

const databaseUrl = databaseUrlMatch[1].trim();
console.log("\nDATABASE_URL found:", databaseUrl);

// Check for correct format
if (!databaseUrl.startsWith('postgresql://')) {
    console.error("\nERROR: Invalid DATABASE_URL format. It should start with 'postgresql://'");
    process.exit(1);
}

console.log("\nDatabase URL format is correct.");

// Create a temporary script to run with the environment variable manually set
const tempScriptContent = `
#!/bin/bash
export DATABASE_URL="${databaseUrl}"
export NODE_ENV=development
export PORT=5000

echo "Starting application with explicit environment variables:"
echo "DATABASE_URL = $DATABASE_URL"
echo "NODE_ENV = $NODE_ENV"
echo "PORT = $PORT"
echo ""

npm run dev
`;

fs.writeFileSync('start-with-env.sh', tempScriptContent);
fs.chmodSync('start-with-env.sh', 0o755);

console.log("\nI've created a special startup script that explicitly sets the environment variables:");
console.log("---------------------------------------");
console.log("Try running this command to start the application:");
console.log("    ./start-with-env.sh");
console.log("---------------------------------------");

// Print troubleshooting information
console.log("\nTroubleshooting information:");
console.log("- Node.js version:", process.version);
console.log("- Current directory:", process.cwd());
console.log("- User home directory:", require('os').homedir());
console.log("- Environment variables present:", Object.keys(process.env).length);

// Check if dotenv module is available
try {
    // Try loading dotenv programmatically and see if it works
    require('dotenv').config();
    if (process.env.DATABASE_URL) {
        console.log("\nDOTENV TEST SUCCESSFUL: DATABASE_URL was loaded properly when using require('dotenv').config()");
        console.log("This suggests that you should modify server/db.ts to explicitly load dotenv at the top of the file.");
    } else {
        console.log("\nDOTENV TEST FAILED: DATABASE_URL wasn't loaded by dotenv. This suggests a configuration issue.");
    }
} catch (error) {
    console.log("\nNote: dotenv module not installed. You may want to install it:");
    console.log("    npm install dotenv");
}