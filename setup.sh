#!/bin/bash

# Setup script for Media Processor and Web Interface
# This script automates all the necessary steps to get the system running

echo "🎬 Setting up Media Processor and Web Interface..."

# 1. Make sure we're in the right directory
cd "$(dirname "$0")"
CURRENT_DIR=$(pwd)
echo "📂 Working directory: $CURRENT_DIR"

# 2. Make the media processor script executable
if [ -f "$CURRENT_DIR/media-processor.sh" ]; then
    echo "✅ Making media-processor.sh executable"
    chmod +x "$CURRENT_DIR/media-processor.sh"
else
    echo "❌ Error: media-processor.sh not found in $CURRENT_DIR"
    exit 1
fi

# 3. Install dependencies for the web interface
if [ -d "$CURRENT_DIR/web-app" ]; then
    echo "📦 Installing web interface dependencies"
    cd "$CURRENT_DIR/web-app"
    npm install
    npm run build
    
    if [ -d "$CURRENT_DIR/web-app/api" ]; then
        echo "📦 Installing API server dependencies"
        cd "$CURRENT_DIR/web-app/api"
        npm install
    else
        echo "❌ Error: API directory not found in $CURRENT_DIR/web-app"
        exit 1
    fi
else
    echo "❌ Error: web-app directory not found in $CURRENT_DIR"
    exit 1
fi

# 4. Set up systemd services
echo "🔧 Setting up systemd services"

# Backend service
sudo tee /etc/systemd/system/media-processor.service > /dev/null << EOL
[Unit]
Description=Media Processor Service
After=network.target

[Service]
Type=simple
User=$(whoami)
ExecStart=$CURRENT_DIR/media-processor.sh
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Web interface service
sudo tee /etc/systemd/system/media-processor-ui.service > /dev/null << EOL
[Unit]
Description=Media Processor Web Interface
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$CURRENT_DIR/web-app/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# 5. Enable and start services
echo "🚀 Enabling and starting services"
sudo systemctl daemon-reload
sudo systemctl enable media-processor.service
sudo systemctl enable media-processor-ui.service
sudo systemctl start media-processor.service
sudo systemctl start media-processor-ui.service

# 6. Check service status
echo "🔍 Checking service status"
sudo systemctl status media-processor.service --no-pager
sudo systemctl status media-processor-ui.service --no-pager

echo "✨ Setup complete! Access the web interface at http://localhost:3001"
echo "📝 Check logs with: tail -f /home/sharvinzlife/media-processor.log" 