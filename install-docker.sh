#!/bin/bash

set -e

echo "==================================================="
echo "Jellyfin User Manager - Docker Installation Script"
echo "==================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed."
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create directories
echo "Creating config and data directories..."
mkdir -p config data

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    DOCKERFILE="Dockerfile"
    TAG="amd64"
    ARCH_NAME="AMD64 (x86_64)"
elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
    DOCKERFILE="Dockerfile.arm"
    TAG="arm64"
    ARCH_NAME="ARM64"
else
    echo "Warning: Unsupported architecture: $ARCH"
    echo "Defaulting to AMD64 build. This might not work on your system!"
    DOCKERFILE="Dockerfile"
    TAG="amd64"
    ARCH_NAME="AMD64 (x86_64)"
fi

echo "Detected $ARCH_NAME architecture, using $DOCKERFILE"

# Build the docker image
echo "Building Docker image for $ARCH_NAME..."
DOCKERFILE=$DOCKERFILE TAG=$TAG ARCH=$ARCH docker-compose build

# Start the containers
echo "Starting Docker containers..."
docker-compose up -d

# Check if containers are running
echo "Checking if containers are running..."
sleep 5

if [ "$(docker ps -q -f name=jellyfin-manager)" ]; then
    echo "Jellyfin User Manager container is running!"
else
    echo "Error: Jellyfin User Manager container failed to start."
    echo "Check logs with: docker-compose logs"
    exit 1
fi

if [ "$(docker ps -q -f name=jellyfin-manager-db)" ]; then
    echo "Database container is running!"
else
    echo "Error: Database container failed to start."
    echo "Check logs with: docker-compose logs db"
    exit 1
fi

# Get the host IP address for the URL
HOST_IP=$(hostname -I | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP="localhost"
fi

echo "==================================================="
echo "Installation completed successfully!"
echo "==================================================="
echo "Jellyfin User Manager is now running at:"
echo "  http://$HOST_IP:5000"
echo ""
echo "To stop the application:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "Configuration is stored in:"
echo "  $(pwd)/config"
echo "==================================================="