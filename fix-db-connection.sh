#!/bin/bash

set -e

echo "Running database connection fix script..."
npx tsx fix-db-connection.js

# If the fix is successful, ask if the user wants to check the database connection
if [ $? -eq 0 ]; then
    echo ""
    read -p "Do you want to check your database connection now? (y/n): " CHECK_DB
    
    if [[ "$CHECK_DB" =~ ^[Yy]$ ]]; then
        ./check-db.sh
    fi
fi