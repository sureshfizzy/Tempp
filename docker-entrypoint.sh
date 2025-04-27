#!/bin/sh
set -e

# Apply ownership to mounted volumes if running as root
if [ "$(id -u)" = "0" ]; then
  echo "Running as root user, changing ownership of volumes..."
  
  # Check if PUID/PGID env vars are set, otherwise use default values (1000)
  PUID=${PUID:-1000}
  PGID=${PGID:-1000}
  
  # Set ownership based on PUID/PGID
  chown -R $PUID:$PGID /app/config /app/data
  
  # Switch to non-root user
  exec su-exec jellyfin "$@"
fi

# Database setup
if [ ! -z "$DATABASE_URL" ]; then
  echo "Database URL is set, checking connection..."
  
  # Wait for database to be ready
  MAX_RETRIES=30
  RETRIES=0
  
  until node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT 1').then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });" > /dev/null 2>&1
  do
    RETRIES=$((RETRIES+1))
    
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
      echo "Could not connect to database after $MAX_RETRIES attempts, proceeding anyway..."
      break
    fi
    
    echo "Waiting for database connection... ($RETRIES/$MAX_RETRIES)"
    sleep 1
  done
  
  if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
    echo "Database connection established."
  fi
fi

# Run the provided command
exec "$@"