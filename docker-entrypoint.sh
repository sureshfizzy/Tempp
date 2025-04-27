#!/bin/sh
set -e

# Apply user-provided UID/GID if they differ from the defaults (1000/1000)
if [ "${PUID}" != "1000" ] || [ "${PGID}" != "1000" ]; then
    echo "Updating user/group IDs: PUID=${PUID}, PGID=${PGID}"
    
    # Update group ID
    sed -i -e "s/^jellyfin:x:1000:/jellyfin:x:${PGID}:/" /etc/group
    
    # Update user ID
    sed -i -e "s/^jellyfin:x:1000:1000:/jellyfin:x:${PUID}:${PGID}:/" /etc/passwd
    
    # Fix permissions on data directories
    chown -R ${PUID}:${PGID} /app/config /app/data
fi

# Set up data directory for SQLite
if [ -z "${DATABASE_URL}" ] || [ "${DATABASE_URL}" = "" ]; then
    echo "Using SQLite database (embedded)"
    mkdir -p "${DATA_DIR:-/app/data}"
    
    # Ensure SQLite directory is writable
    if [ -n "${PUID}" ] && [ -n "${PGID}" ]; then
        chown -R ${PUID}:${PGID} "${DATA_DIR:-/app/data}"
    fi
else
    echo "Using PostgreSQL database at: ${DATABASE_URL}"
fi

# First parameter contains command to run
exec "$@"