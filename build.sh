#!/bin/bash

set -e

echo "==============================================="
echo "Jellyfin User Manager - Build Script"
echo "==============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v18+ before proceeding."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version is $NODE_VERSION. Please install Node.js v18+ before proceeding."
    exit 1
fi

echo "Node.js version $(node -v) detected."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the project
echo "Building the project..."
npm run build

echo "==============================================="
echo "Build completed successfully!"
echo "==============================================="
echo "To start the application:"
echo "1. Make sure your PostgreSQL database is running"
echo "2. Copy .env.example to .env and update the database connection string"
echo "3. Run: npm start"
echo "==============================================="