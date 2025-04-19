#!/bin/bash
#
# Restart Media Processor Services
# This script restarts the media processor and web interface services
#

echo "Killing any process using port 3001 (backend and dashboard)..."
if lsof -i :3001 -t >/dev/null; then
  lsof -i :3001 -t | xargs -r kill -9
  echo "Killed process on port 3001."
else
  echo "No process found on port 3001."
fi

# Stop systemd service if available
if systemctl list-units --full -all | grep -Fq "media-processor.service"; then
  echo "Stopping media processor service..."
  sudo systemctl stop media-processor.service
else
  echo "media-processor.service not managed by systemd or not found."
fi

echo "Copying updated service file..."
sudo cp media-processor.service /etc/systemd/system/

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Starting media processor service..."
if systemctl list-units --full -all | grep -Fq "media-processor.service"; then
  sudo systemctl start media-processor.service
else
  echo "Fallback: Starting backend/dashboard using npm (web-app/api)..."
  cd "$(dirname "$0")/web-app/api" && nohup npm start &
fi

echo "Checking service status..."
echo "Media Processor Service:"
sudo systemctl status media-processor.service --no-pager

echo "Restart complete. Dashboard and API are served by media-processor.service on port 3001."