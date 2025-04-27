#!/bin/sh

# Apply user and group IDs if provided
if [ ! -z "${PUID}" ] && [ ! -z "${PGID}" ]; then
    # Get current user and group IDs
    CURR_UID=$(id -u jellyfin)
    CURR_GID=$(id -g jellyfin)

    # Change IDs only if they don't match
    if [ "${PUID}" != "${CURR_UID}" ] || [ "${PGID}" != "${CURR_GID}" ]; then
        echo "Changing jellyfin user UID:GID from $CURR_UID:$CURR_GID to $PUID:$PGID"
        
        # Create a temporary user to avoid permission issues during transition
        addgroup -g 9999 tempgroup
        adduser -D -u 9999 -G tempgroup tempuser
        
        # Change ownership of all files in the app directory
        chown -R tempuser:tempgroup /app
        
        # Modify the jellyfin group ID
        sed -i -e "s/^jellyfin:x:${CURR_GID}:/jellyfin:x:${PGID}:/" /etc/group
        
        # Modify the jellyfin user ID and group ID
        sed -i -e "s/^jellyfin:x:${CURR_UID}:${CURR_GID}:/jellyfin:x:${PUID}:${PGID}:/" /etc/passwd
        
        # Change ownership back to jellyfin user with new IDs
        chown -R jellyfin:jellyfin /app
        
        # Remove temporary user and group
        deluser tempuser
        delgroup tempgroup
    fi
fi

# Ensure config and data directories exist with proper permissions
mkdir -p /app/config /app/data
chown -R jellyfin:jellyfin /app/config /app/data

# Wait a moment to ensure the database directory is ready
sleep 1

# Set proper permissions for SQLite database directory
echo "Setting up SQLite database directory..."
touch /app/data/jellyfin-manager.db
chown jellyfin:jellyfin /app/data/jellyfin-manager.db

# Execute the command provided as arguments
exec "$@"