#!/bin/bash

set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker before proceeding."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose before proceeding."
    exit 1
fi

echo "==============================================="
echo "Jellyfin User Manager - Multi-Architecture Build"
echo "==============================================="

# Build for AMD64 (x86_64)
echo "Building for AMD64 architecture..."
DOCKERFILE=Dockerfile TAG=amd64 ARCH=amd64 docker-compose build

# Build for ARM64 (aarch64)
echo "Building for ARM64 architecture..."
DOCKERFILE=Dockerfile.arm TAG=arm64 ARCH=arm64 docker-compose build

echo "==============================================="
echo "Multi-architecture builds completed successfully!"
echo "==============================================="
echo "Docker images available:"
echo "- jellyfin-manager:amd64 (for x86_64 systems)"
echo "- jellyfin-manager:arm64 (for ARM64 systems)"
echo ""
echo "To run the container using docker-compose:"
echo "  docker-compose up -d"
echo ""
echo "To run the specific architecture manually:"
echo "  docker run -d -p 5000:5000 -v $(pwd)/config:/app/config -v $(pwd)/data:/app/data jellyfin-manager:amd64"
echo "  or"
echo "  docker run -d -p 5000:5000 -v $(pwd)/config:/app/config -v $(pwd)/data:/app/data jellyfin-manager:arm64"
echo "==============================================="