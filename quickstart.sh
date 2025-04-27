#!/bin/bash

set -e

echo "======================================================"
echo "Jellyfin User Manager - Quick Start Script"
echo "======================================================"

SETUP_DATABASE=true

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
        SETUP_DATABASE=false
    fi
else
    RECREATE_ENV="y"
fi

# Database setup
if [ "$SETUP_DATABASE" = true ]; then
    echo "======================================================"
    echo "Database Setup"
    echo "======================================================"
    
    # Show available options
    echo "Available database setup options:"
    
    # Option 1: Docker PostgreSQL
    if command -v docker &> /dev/null; then
        echo "1: Use Docker PostgreSQL container (recommended)"
        HAS_DOCKER=true
    else
        HAS_DOCKER=false
    fi
    
    # Option 2: Local PostgreSQL
    if command -v psql &> /dev/null; then
        echo "2: Use existing PostgreSQL server"
        HAS_PSQL=true
    else
        HAS_PSQL=false
    fi
    
    # Option 3: Manual entry
    echo "3: Enter database connection string manually"
    
    echo ""
    echo "Select database setup method (1-3):"
    read -r DB_OPTION
    
    case $DB_OPTION in
        1)
            if [ "$HAS_DOCKER" = false ]; then
                echo "Error: Docker is not installed. Please select another option."
                exit 1
            fi
            
            # Check if container already exists
            if docker ps -a --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                echo "A container named jellyfin-manager-db already exists."
                echo "Do you want to remove it and create a new one? (y/n)"
                read -r RECREATE_CONTAINER
                
                if [[ "$RECREATE_CONTAINER" =~ ^[Yy]$ ]]; then
                    echo "Stopping and removing existing container..."
                    docker stop jellyfin-manager-db || true
                    docker rm jellyfin-manager-db || true
                    CREATE_NEW_CONTAINER=true
                else
                    # Check if container is running
                    if docker ps --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                        echo "Using existing running PostgreSQL container."
                        CREATE_NEW_CONTAINER=false
                    else
                        echo "Starting existing PostgreSQL container..."
                        docker start jellyfin-manager-db
                        CREATE_NEW_CONTAINER=false
                    fi
                fi
            else
                CREATE_NEW_CONTAINER=true
            fi
            
            if [ "$CREATE_NEW_CONTAINER" = true ]; then
                echo "Create a new database with:"
                echo "Enter database name (default: jellyfin_manager):"
                read -r DB_NAME
                DB_NAME=${DB_NAME:-jellyfin_manager}
                
                echo "Enter PostgreSQL password (default: postgres):"
                read -rs PG_PASS
                PG_PASS=${PG_PASS:-postgres}
                
                echo "Starting PostgreSQL container..."
                docker run -d \
                    --name jellyfin-manager-db \
                    -e POSTGRES_USER=postgres \
                    -e POSTGRES_PASSWORD=$PG_PASS \
                    -e POSTGRES_DB=$DB_NAME \
                    -p 5432:5432 \
                    postgres:15-alpine
                
                echo "Waiting for PostgreSQL to initialize (this may take a few seconds)..."
                sleep 10
                
                DB_URL="postgresql://postgres:$PG_PASS@localhost:5432/$DB_NAME"
            else
                # Using existing container
                echo "Enter PostgreSQL password (default: postgres):"
                read -rs PG_PASS
                PG_PASS=${PG_PASS:-postgres}
                
                echo "Enter database name (default: jellyfin_manager):"
                read -r DB_NAME
                DB_NAME=${DB_NAME:-jellyfin_manager}
                
                DB_URL="postgresql://postgres:$PG_PASS@localhost:5432/$DB_NAME"
            fi
            ;;
            
        2)
            if [ "$HAS_PSQL" = false ]; then
                echo "Error: PostgreSQL client is not installed. Please select another option."
                exit 1
            fi
            
            echo "Enter PostgreSQL connection details:"
            echo "Username (default: postgres):"
            read -r PG_USER
            PG_USER=${PG_USER:-postgres}
            
            echo "Password:"
            read -rs PG_PASS
            
            echo "Host (default: localhost):"
            read -r PG_HOST
            PG_HOST=${PG_HOST:-localhost}
            
            echo "Port (default: 5432):"
            read -r PG_PORT
            PG_PORT=${PG_PORT:-5432}
            
            echo "Database name (default: jellyfin_manager):"
            read -r DB_NAME
            DB_NAME=${DB_NAME:-jellyfin_manager}
            
            echo "Do you want to create this database if it doesn't exist? (y/n)"
            read -r CREATE_DB
            
            if [[ "$CREATE_DB" =~ ^[Yy]$ ]]; then
                echo "Creating database..."
                PGPASSWORD=$PG_PASS psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "CREATE DATABASE $DB_NAME;" || {
                    echo "Warning: Failed to create database. It might already exist."
                }
            fi
            
            DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME"
            ;;
            
        3)
            echo "Enter complete PostgreSQL connection URL:"
            echo "Format: postgresql://username:password@hostname:port/database_name"
            read -r DB_URL
            ;;
            
        *)
            echo "Invalid option. Exiting."
            exit 1
            ;;
    esac
    
    # Create .env file
    echo "Creating .env file with database connection..."
    cat > .env << EOF
DATABASE_URL=$DB_URL
NODE_ENV=development
PORT=5000
EOF
    
    echo "Database configuration saved to .env file."
fi

# Application setup
echo "======================================================"
echo "Application Setup"
echo "======================================================"

# Ask if user wants to install dependencies
if [ ! -d "node_modules" ] || [[ "$RECREATE_ENV" =~ ^[Yy]$ ]]; then
    echo "Do you want to install/update dependencies? (y/n)"
    read -r INSTALL_DEPS
    
    if [[ "$INSTALL_DEPS" =~ ^[Yy]$ ]]; then
        echo "Installing dependencies (this may take a few minutes)..."
        npm install
    else
        echo "Skipping dependency installation."
        if [ ! -d "node_modules" ]; then
            echo "Warning: Dependencies are not installed. You will need to run 'npm install' before starting the application."
        fi
    fi
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