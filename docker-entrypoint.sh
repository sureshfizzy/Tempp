#!/bin/sh

set -e

# If command starts with an option, prepend the default command
if [ "${1:0:1}" = '-' ]; then
  set -- node dist/server/index.js "$@"
fi

# Create config and data directories if they don't exist
mkdir -p /app/config /app/data

# Handle PUID/PGID
if [ -n "${PUID}" ] && [ -n "${PGID}" ]; then
  if [ -n "$(getent passwd jellyfin)" ]; then
    # Update existing user/group IDs
    usermod -o -u ${PUID} jellyfin
    groupmod -o -g ${PGID} jellyfin
  else
    # Add jellyfin user/group with specified IDs
    addgroup -g ${PGID} jellyfin
    adduser -D -G jellyfin -u ${PUID} jellyfin
  fi
  
  # Fix ownership of application directories
  chown -R jellyfin:jellyfin /app/config /app/data
fi

# Check database connection
echo "Checking database connection..."
for i in $(seq 1 30); do
  if nc -z ${DATABASE_HOST:-db} ${DATABASE_PORT:-5432}; then
    echo "Database is available, continuing..."
    break
  fi
  echo "Waiting for database (${i}/30)..."
  sleep 1
  if [ "$i" = "30" ]; then
    echo "Error: Cannot connect to database"
    exit 1
  fi
done

# Print startup message
echo "==================================================="
echo "Starting Jellyfin User Manager"
echo "==================================================="

# Run the main command
exec "$@"