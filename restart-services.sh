#!/bin/bash
#
# Restart Media Processor Services
# This script restarts the media processor and web interface services
#

echo "Stopping media processor service..."
sudo systemctl stop media-processor.service

echo "Stopping web interface service..."
sudo systemctl stop media-processor-web.service

echo "Copying updated service files..."
sudo cp media-processor.service /etc/systemd/system/
sudo cp media-processor-web.service /etc/systemd/system/

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Starting media processor service..."
sudo systemctl start media-processor.service

echo "Starting web interface service..."
sudo systemctl start media-processor-web.service

echo "Checking service status..."
echo "Media Processor Service:"
sudo systemctl status media-processor.service --no-pager

echo "Web Interface Service:"
sudo systemctl status media-processor-web.service --no-pager

echo "Services restarted successfully!"