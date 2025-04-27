#!/bin/bash

set -e

echo "======================================================"
echo "Jellyfin User Manager - Development Starter"
echo "======================================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please run the quickstart.sh script first to set up your environment."
    exit 1
fi

# Read DATABASE_URL from .env file
DATABASE_URL=$(grep -E "^DATABASE_URL=" .env | cut -d '=' -f2-)

# Check if DATABASE_URL was found and is not empty
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env file!"
    echo "Make sure your .env file contains a line like:"
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jellyfin_manager"
    exit 1
fi

echo "Found DATABASE_URL in .env file."

# Export environment variables explicitly
export DATABASE_URL="$DATABASE_URL"
export NODE_ENV=development
export PORT=5000

echo "Starting development server with explicit environment variables..."
echo "DATABASE_URL = ${DATABASE_URL:0:25}..."
echo "NODE_ENV = $NODE_ENV"
echo "PORT = $PORT"
echo ""

# Start the development server
npm run dev