#!/bin/bash

set -e

echo "======================================================"
echo "Jellyfin User Manager - Quick Start Script"
echo "======================================================"

# Check if .env file exists
if [ -f .env ]; then
    echo "Existing .env file found. Would you like to recreate it? (y/n)"
    read -r RECREATE_ENV
    if [[ "$RECREATE_ENV" =~ ^[Yy]$ ]]; then
        echo "Creating new .env file..."
    else
        echo "Keeping existing .env file."
        echo "If you're having database connection issues, please check your DATABASE_URL setting."
        echo ""
        echo "Current .env content:"
        cat .env
        echo ""
        echo "Do you want to proceed with the rest of the setup? (y/n)"
        read -r CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
else
    RECREATE_ENV="y"
fi

# Create new .env file if needed
if [[ "$RECREATE_ENV" =~ ^[Yy]$ ]]; then
    # Check if Docker is available for PostgreSQL
    if command -v docker &> /dev/null; then
        echo "Docker detected. Would you like to start a PostgreSQL database container? (y/n)"
        read -r START_DB
        
        if [[ "$START_DB" =~ ^[Yy]$ ]]; then
            # Check if container already exists
            if docker ps -a --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                echo "A container named jellyfin-manager-db already exists."
                echo "Do you want to remove it and create a new one? (y/n)"
                read -r RECREATE_CONTAINER
                
                if [[ "$RECREATE_CONTAINER" =~ ^[Yy]$ ]]; then
                    echo "Stopping and removing existing container..."
                    docker stop jellyfin-manager-db || true
                    docker rm jellyfin-manager-db || true
                    START_NEW_CONTAINER="y"
                else
                    # Check if container is running
                    if docker ps --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                        echo "Using existing running PostgreSQL container."
                        START_NEW_CONTAINER="n"
                    else
                        echo "Starting existing PostgreSQL container..."
                        docker start jellyfin-manager-db
                        START_NEW_CONTAINER="n"
                    fi
                fi
            else
                START_NEW_CONTAINER="y"
            fi
            
            # Start a new container if needed
            if [[ "$START_NEW_CONTAINER" = "y" ]]; then
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
                
                # Wait for PostgreSQL to start
                echo "Waiting for PostgreSQL to start (this may take a few seconds)..."
                sleep 5
            fi
            
            # Create .env file with Docker PostgreSQL
            if [[ "$START_NEW_CONTAINER" = "y" ]]; then
                DB_URL="postgresql://postgres:$PG_PASS@localhost:5432/jellyfin_manager"
            else
                echo "Enter your PostgreSQL password (default: postgres):"
                read -rs PG_PASS
                PG_PASS=${PG_PASS:-postgres}
                DB_URL="postgresql://postgres:$PG_PASS@localhost:5432/jellyfin_manager"
            fi
        else
            # Manual database setup
            echo "Please enter your PostgreSQL connection string (e.g., postgresql://user:password@localhost:5432/database):"
            read -r DB_URL
        fi
    else
        # No Docker, manual entry
        echo "Please enter your PostgreSQL connection string (e.g., postgresql://user:password@localhost:5432/database):"
        read -r DB_URL
    fi
    
    # Create the .env file
    echo "Creating .env file with database connection..."
    cat > .env << EOF
DATABASE_URL=$DB_URL
NODE_ENV=development
PORT=5000
EOF
    
    echo ".env file created successfully."
fi

# Ask if user wants to install NPM dependencies
echo "Do you want to install/update NPM dependencies? (y/n)"
read -r INSTALL_DEPS

if [[ "$INSTALL_DEPS" =~ ^[Yy]$ ]]; then
    echo "Installing dependencies..."
    npm install
fi

# Ask if user wants to start the application
echo "Do you want to start the application now? (y/n)"
read -r START_APP

if [[ "$START_APP" =~ ^[Yy]$ ]]; then
    echo "Starting application in development mode..."
    echo "======================================================"
    echo "Application will be available at: http://localhost:5000"
    echo "======================================================"
    npm run dev
else
    echo "======================================================"
    echo "Setup completed. To start the application, run:"
    echo "  npm run dev"
    echo ""
    echo "Application will be available at: http://localhost:5000"
    echo "======================================================"
fi