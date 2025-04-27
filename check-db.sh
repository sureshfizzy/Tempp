#!/bin/bash

set -e

echo "Running database connection check..."
npx tsx check-db.js

# If the check is successful, ask if the user wants to start the application
if [ $? -eq 0 ]; then
    echo ""
    read -p "Do you want to start the application now? (y/n): " START_APP
    
    if [[ "$START_APP" =~ ^[Yy]$ ]]; then
        ./start-dev.sh
    fi
fi