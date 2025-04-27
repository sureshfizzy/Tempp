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
    
    # Export DATA_DIR variable so app can find it
    export DATA_DIR="${DATA_DIR:-/app/data}"
    
    # IMPORTANT: Make sure DATABASE_URL is explicitly empty to force SQLite mode
    export DATABASE_URL=""
    
    # Create data directory if it doesn't exist
    mkdir -p "${DATA_DIR}"
    
    # Ensure SQLite directory is writable
    if [ -n "${PUID}" ] && [ -n "${PGID}" ]; then
        chown -R ${PUID}:${PGID} "${DATA_DIR}"
        echo "Set SQLite directory permissions for user ${PUID}:${PGID}"
    fi
    
    echo "SQLite database will be stored at: ${DATA_DIR}/jellyfin-manager.db"
else
    echo "Using PostgreSQL database at: ${DATABASE_URL}"
fi

# First parameter contains command to run
exec "$@"