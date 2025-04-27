#!/bin/bash

# Build Docker image for the current architecture
ARCH=$(uname -m)
TAG="latest"

if [ "$ARCH" = "x86_64" ]; then
  DOCKERFILE="Dockerfile"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  DOCKERFILE="Dockerfile.arm"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

echo "Building Docker image for architecture: $ARCH using $DOCKERFILE"
docker build -t jellyfin-manager:$TAG -f $DOCKERFILE .

echo "Build complete!"
echo "Your image is now available as jellyfin-manager:$TAG"
echo ""
echo "To run the container:"
echo "docker run -d --name jellyfin-manager -p 5000:5000 -v ./data:/app/data -v ./config:/app/config jellyfin-manager:$TAG"