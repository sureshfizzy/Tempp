#!/bin/bash

# Multi-architecture Docker build script
# Builds for amd64 and arm64, tags them, and creates a multi-arch manifest

# Set variables
IMAGE_NAME="jellyfin-manager"
TAG="latest"
REGISTRY="" # Set this to your Docker Hub username if you're publishing the image

# Check if Docker buildx is available
if ! docker buildx version > /dev/null 2>&1; then
  echo "Docker buildx not available. Please install or enable Docker buildx."
  exit 1
fi

# Create or use a builder instance
BUILDER="multi-arch-builder"
if ! docker buildx inspect $BUILDER > /dev/null 2>&1; then
  echo "Creating new buildx builder: $BUILDER"
  docker buildx create --name $BUILDER --use
else
  echo "Using existing buildx builder: $BUILDER"
  docker buildx use $BUILDER
fi

# Build for multiple platforms
echo "Building multi-arch Docker image for: linux/amd64, linux/arm64"

if [ -z "$REGISTRY" ]; then
  # No registry specified, build locally
  echo "Building multi-arch images (local only)"
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t $IMAGE_NAME:$TAG \
    --load .
else
  # Registry specified, build and push
  echo "Building and pushing multi-arch images to $REGISTRY/$IMAGE_NAME:$TAG"
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t $REGISTRY/$IMAGE_NAME:$TAG \
    --push .
fi

echo "Build complete!"
if [ -z "$REGISTRY" ]; then
  echo "Your multi-arch image is now available as $IMAGE_NAME:$TAG"
  echo ""
  echo "To run the container:"
  echo "docker run -d --name jellyfin-manager -p 5000:5000 -v ./data:/app/data -v ./config:/app/config $IMAGE_NAME:$TAG"
else
  echo "Your multi-arch image is now available as $REGISTRY/$IMAGE_NAME:$TAG"
  echo ""
  echo "To run the container:"
  echo "docker run -d --name jellyfin-manager -p 5000:5000 -v ./data:/app/data -v ./config:/app/config $REGISTRY/$IMAGE_NAME:$TAG"
fi