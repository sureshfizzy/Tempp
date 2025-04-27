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

# Database Setup
echo "==================================================="
echo "Database Setup"
echo "==================================================="
echo "Do you want to set up a database for Jellyfin User Manager? (y/n)"
read -r SETUP_DB

if [[ "$SETUP_DB" =~ ^[Yy]$ ]]; then
    # Check available methods for database setup
    DB_METHOD=""
    
    # Option 1: Docker
    if command -v docker &> /dev/null; then
        echo "1: Docker PostgreSQL container (easiest)"
        HAS_DOCKER=true
    else
        HAS_DOCKER=false
    fi
    
    # Option 2: Local PostgreSQL
    if command -v psql &> /dev/null; then
        echo "2: Local PostgreSQL server"
        HAS_PSQL=true
    else
        HAS_PSQL=false
    fi
    
    # Option 3: Manual configuration
    echo "3: Manual configuration"
    
    # Get the user's choice
    echo ""
    echo "Select database setup method (1-3):"
    read -r DB_METHOD_CHOICE
    
    case $DB_METHOD_CHOICE in
        1)
            if [ "$HAS_DOCKER" = false ]; then
                echo "Error: Docker is not installed. Please choose another option."
                exit 1
            fi
            
            echo "Enter a password for PostgreSQL (default: postgres):"
            read -rs PG_PASS
            PG_PASS=${PG_PASS:-postgres}
            
            echo "Enter a database name (default: jellyfin_manager):"
            read -r DB_NAME
            DB_NAME=${DB_NAME:-jellyfin_manager}
            
            # Check if container already exists
            if docker ps -a --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                echo "A container named jellyfin-manager-db already exists."
                echo "Do you want to remove it and create a new one? (y/n)"
                read -r RECREATE_CONTAINER
                
                if [[ "$RECREATE_CONTAINER" =~ ^[Yy]$ ]]; then
                    echo "Stopping and removing existing container..."
                    docker stop jellyfin-manager-db || true
                    docker rm jellyfin-manager-db || true
                    NEED_NEW_CONTAINER=true
                else
                    # Check if container is running
                    if docker ps --format '{{.Names}}' | grep -q "jellyfin-manager-db"; then
                        echo "Using existing running PostgreSQL container."
                        NEED_NEW_CONTAINER=false
                    else
                        echo "Starting existing PostgreSQL container..."
                        docker start jellyfin-manager-db
                        NEED_NEW_CONTAINER=false
                    fi
                fi
            else
                NEED_NEW_CONTAINER=true
            fi
            
            # Start a new container if needed
            if [ "$NEED_NEW_CONTAINER" = true ]; then
                echo "Starting new PostgreSQL container..."
                docker run -d \
                    --name jellyfin-manager-db \
                    -e POSTGRES_USER=postgres \
                    -e POSTGRES_PASSWORD=$PG_PASS \
                    -e POSTGRES_DB=$DB_NAME \
                    -p 5432:5432 \
                    postgres:15-alpine
                
                # Wait for PostgreSQL to start
                echo "Waiting for PostgreSQL to start (this may take a few seconds)..."
                sleep 10
            fi
            
            # Create .env file with database connection
            echo "Creating .env file with Docker database connection..."
            cat > .env << EOF
DATABASE_URL=postgresql://postgres:$PG_PASS@localhost:5432/$DB_NAME
NODE_ENV=development
PORT=5000
EOF
            ;;
            
        2)
            if [ "$HAS_PSQL" = false ]; then
                echo "Error: PostgreSQL client is not installed. Please choose another option."
                exit 1
            fi
            
            echo "Enter PostgreSQL username (default: postgres):"
            read -r PG_USER
            PG_USER=${PG_USER:-postgres}
            
            echo "Enter PostgreSQL password:"
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
            echo "Creating .env file with local PostgreSQL connection..."
            cat > .env << EOF
DATABASE_URL=postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME
NODE_ENV=development
PORT=5000
EOF
            ;;
            
        3)
            echo "Enter complete PostgreSQL connection URL:"
            echo "Format: postgresql://user:password@host:port/database"
            read -r DB_URL
            
            # Create .env file with manual database connection
            echo "Creating .env file with manual database connection..."
            cat > .env << EOF
DATABASE_URL=$DB_URL
NODE_ENV=development
PORT=5000
EOF
            ;;
            
        *)
            echo "Invalid selection. Exiting."
            exit 1
            ;;
    esac
    
    echo "Database configuration completed successfully."
else
    echo "Skipping database setup."
    echo "You'll need to set up the DATABASE_URL in .env file manually before running the application."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: You must edit the .env file with your database credentials before running the application!"
    echo ""
    ${EDITOR:-vi} .env
fi

# Application installation
echo "==================================================="
echo "Application Installation"
echo "==================================================="

echo "Do you want to install application dependencies? (y/n)"
read -r INSTALL_DEPS

if [[ "$INSTALL_DEPS" =~ ^[Yy]$ ]]; then
    echo "Installing dependencies..."
    npm ci
else
    echo "Skipping dependency installation."
    echo "You'll need to run 'npm ci' before starting the application."
fi

echo "Do you want to build the application? (y/n)"
read -r BUILD_APP

if [[ "$BUILD_APP" =~ ^[Yy]$ ]]; then
    echo "Building the application..."
    npm run build
else
    echo "Skipping application build."
    echo "You'll need to run 'npm run build' before starting the application."
fi

# Create config and data directories
echo "Creating config and data directories..."
mkdir -p config data

echo "==================================================="
echo "Installation completed!"
echo "==================================================="

echo "Start the application now? (y/n)"
read -r START_APP

if [[ "$START_APP" =~ ^[Yy]$ ]]; then
    echo "Starting application in development mode..."
    npm run dev
else
    echo "To start the application, run:"
    echo "  npm run dev    # For development mode"
    echo "  npm start      # For production mode"
    echo ""
    echo "The application will be available at:"
    echo "  http://localhost:5000"
fi
echo "==================================================="