#!/bin/bash

# Media Processor Setup Script
# This script installs the Media Processor services and dependencies

# Ensure script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Installing Media Processor services..."

# Install dependencies
echo "Installing required packages..."
apt-get update
apt-get install -y smbclient ffmpeg mkvtoolnix mediainfo nodejs npm

# Create necessary directories
mkdir -p "$PROJECT_DIR/web-app/build"

# Install Node.js dependencies for web interface
echo "Installing Node.js dependencies..."
cd "$PROJECT_DIR/web-app"
npm init -y
npm install express cors

# Copy service files to systemd directory
echo "Installing systemd services..."
cp "$PROJECT_DIR/media-processor.service" /etc/systemd/system/
cp "$PROJECT_DIR/media-processor-web.service" /etc/systemd/system/

# Reload systemd to recognize new services
systemctl daemon-reload

# Enable services to start on boot
systemctl enable media-processor.service
systemctl enable media-processor-web.service

# Start services
echo "Starting services..."
systemctl start media-processor.service
systemctl start media-processor-web.service

# Check service status
echo "Checking service status..."
systemctl status media-processor.service
systemctl status media-processor-web.service

echo "Setup completed successfully!"
echo "Media Processor is now installed and running."
echo "Web interface is available at http://localhost:8080"
