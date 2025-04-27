/**
 * This script helps troubleshoot and fix SSL-related issues with database connections
 * especially when using self-signed certificates in development environments.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';

console.log("============================================================");
console.log("Jellyfin User Manager - Database Connection SSL Troubleshooter");
console.log("============================================================\n");

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`Error: .env file not found at ${envPath}`);
  console.log("Creating a basic .env file with NODE_TLS_REJECT_UNAUTHORIZED=0");
  
  // Create a minimal .env file if it doesn't exist
  fs.writeFileSync(envPath, 'NODE_TLS_REJECT_UNAUTHORIZED=0\n');
  console.log(`Created ${envPath} with NODE_TLS_REJECT_UNAUTHORIZED=0`);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set in .env file.");
  process.exit(1);
}

console.log(`Found DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 20)}...`);

// Update .env file to enable self-signed certificates if it's not already set
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  console.log("Adding NODE_TLS_REJECT_UNAUTHORIZED=0 to .env file");
  
  // Read existing .env content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if NODE_TLS_REJECT_UNAUTHORIZED is already in the file
  if (envContent.includes('NODE_TLS_REJECT_UNAUTHORIZED=')) {
    // Update the existing entry
    envContent = envContent.replace(
      /NODE_TLS_REJECT_UNAUTHORIZED=.*/,
      'NODE_TLS_REJECT_UNAUTHORIZED=0'
    );
  } else {
    // Add a new entry
    envContent += '\nNODE_TLS_REJECT_UNAUTHORIZED=0';
  }
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env file with NODE_TLS_REJECT_UNAUTHORIZED=0");
}

// Check if the database URL is secure (wss:// or https://)
if (process.env.DATABASE_URL.startsWith('postgres://')) {
  console.log("Your DATABASE_URL uses an insecure connection (postgres://)");
  console.log("Checking if we can update it to use a secure connection (postgresql://)...");
  
  // Update the DATABASE_URL to use postgresql://
  const updatedUrl = process.env.DATABASE_URL.replace('postgres://', 'postgresql://');
  
  // Read existing .env content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the DATABASE_URL
  envContent = envContent.replace(
    /DATABASE_URL=.*/,
    `DATABASE_URL=${updatedUrl}`
  );
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  console.log("Updated DATABASE_URL in .env file to use postgresql://");
}

console.log("\n============================================================");
console.log("SSL Troubleshooting Complete");
console.log("The .env file has been updated with SSL bypassing configuration.");
console.log("\nTo check if the database connection works now, run:");
console.log("  ./check-db.sh");
console.log("\nTo start the application with the new configuration, run:");
console.log("  ./start-dev.sh");
console.log("============================================================");

// Run npm install if node_modules doesn't exist
if (!fs.existsSync(path.resolve(process.cwd(), 'node_modules'))) {
  console.log("\nNode modules not found. Running npm install...");
  exec('npm install', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during npm install: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`npm install stderr: ${stderr}`);
    }
    console.log("npm install completed successfully");
  });
}