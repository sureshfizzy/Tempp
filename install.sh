#!/bin/bash

echo "==================================================="
echo "Jellyfin User Manager - Installation Script"
echo "==================================================="
echo ""
echo "Please select an installation method:"
echo "1. Docker installation (recommended)"
echo "2. Local installation"
echo "==================================================="
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
  1)
    echo "Starting Docker installation..."
    chmod +x ./install-docker.sh
    ./install-docker.sh
    ;;
  2)
    echo "Starting local installation..."
    chmod +x ./install-local.sh
    ./install-local.sh
    ;;
  *)
    echo "Invalid choice. Please run the script again and select 1 or 2."
    exit 1
    ;;
esac