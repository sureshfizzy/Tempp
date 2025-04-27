#!/bin/bash

set -e

echo "==================================================="
echo "Jellyfin User Manager - Local Installation Script"
echo "==================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js v18+ first: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version is $NODE_VERSION. Please install Node.js v18+ first."
    exit 1
fi

echo "Node.js version $(node -v) detected."

# Check for PostgreSQL
echo "Checking for PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "PostgreSQL client found."
    
    # Create database if it doesn't exist
    echo "Do you want to create a new PostgreSQL database for Jellyfin User Manager? (y/n)"
    read -r CREATE_DB
    
    if [[ "$CREATE_DB" =~ ^[Yy]$ ]]; then
        echo "Enter PostgreSQL admin username (default: postgres):"
        read -r PG_USER
        PG_USER=${PG_USER:-postgres}
        
        echo "Enter PostgreSQL admin password:"
        read -rs PG_PASS
        
        echo "Enter PostgreSQL host (default: localhost):"
        read -r PG_HOST
        PG_HOST=${PG_HOST:-localhost}
        
        echo "Enter PostgreSQL port (default: 5432):"
        read -r PG_PORT
        PG_PORT=${PG_PORT:-5432}
        
        echo "Enter database name (default: jellyfin_manager):"
        read -r DB_NAME
        DB_NAME=${DB_NAME:-jellyfin_manager}
        
        echo "Creating database..."
        PGPASSWORD=$PG_PASS psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "CREATE DATABASE $DB_NAME;" || {
            echo "Warning: Failed to create database. It might already exist."
        }
        
        # Create .env file with database connection
        echo "Creating .env file..."
        cat > .env << EOF
DATABASE_URL=postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME
NODE_ENV=production
PORT=5000
EOF
    else
        echo "You'll need to set up the DATABASE_URL in .env file manually."
        cp .env.example .env
        echo ""
        echo "IMPORTANT: You must edit the .env file with your database credentials before running the application!"
        echo ""
        ${EDITOR:-vi} .env
    fi
else
    # If PostgreSQL is not found, offer to run a PostgreSQL container
    echo "PostgreSQL client not found."
    
    if command -v docker &> /dev/null; then
        echo "Docker is installed. Would you like to run a PostgreSQL container? (y/n)"
        read -r RUN_DOCKER_DB
        
        if [[ "$RUN_DOCKER_DB" =~ ^[Yy]$ ]]; then
            echo "Enter a password for PostgreSQL (default: postgres):"
            read -rs PG_PASS
            PG_PASS=${PG_PASS:-postgres}
            
            echo "Starting PostgreSQL container..."
            docker run -d \
                --name jellyfin-manager-db \
                -e POSTGRES_USER=postgres \
                -e POSTGRES_PASSWORD=$PG_PASS \
                -e POSTGRES_DB=jellyfin_manager \
                -p 5432:5432 \
                postgres:15-alpine
            
            # Wait for PostgreSQL to be ready
            echo "Waiting for PostgreSQL to start..."
            sleep 5
            
            # Create .env file with database connection
            echo "Creating .env file..."
            cat > .env << EOF
DATABASE_URL=postgresql://postgres:$PG_PASS@localhost:5432/jellyfin_manager
NODE_ENV=production
PORT=5000
EOF
        else
            echo "You'll need to set up the DATABASE_URL in .env file manually."
            cp .env.example .env
            echo ""
            echo "IMPORTANT: You must edit the .env file with your database credentials before running the application!"
            echo ""
            ${EDITOR:-vi} .env
        fi
    else
        echo "Warning: Neither PostgreSQL nor Docker were found."
        echo "You'll need to install PostgreSQL and set up the DATABASE_URL in .env file manually."
        cp .env.example .env
        echo ""
        echo "IMPORTANT: You must edit the .env file with your database credentials before running the application!"
        echo ""
        ${EDITOR:-vi} .env
    fi
fi

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building the application..."
npm run build

# Create config and data directories
echo "Creating config and data directories..."
mkdir -p config data

echo "==================================================="
echo "Installation completed successfully!"
echo "==================================================="
echo "To start the application, run:"
echo "  npm start"
echo ""
echo "Or in development mode:"
echo "  npm run dev"
echo ""
echo "The application will be available at:"
echo "  http://localhost:5000"
echo ""
echo "IMPORTANT: Make sure your PostgreSQL database is running and"
echo "that DATABASE_URL in your .env file is correct!"
echo "==================================================="