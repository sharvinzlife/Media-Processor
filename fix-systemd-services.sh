#!/bin/bash

# Fix systemd services to use correct user and load environment

echo "Fixing Media Processor systemd services..."

# Stop all services first
sudo systemctl stop media-processor-py.service media-processor-api.service media-processor-ui.service

# Create updated service files
cat > /tmp/media-processor-py.service << 'EOF'
[Unit]
Description=Media Processor Python Service
After=network.target

[Service]
Type=simple
User=sharvinzlife
Group=sharvinzlife
WorkingDirectory=/home/sharvinzlife/media-processor
EnvironmentFile=/home/sharvinzlife/media-processor/.env
Environment=PATH=/home/sharvinzlife/media-processor/python_core/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/sharvinzlife/media-processor/python_core/venv/bin/python /home/sharvinzlife/media-processor/python_core/media_processor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /tmp/media-processor-api.service << 'EOF'
[Unit]
Description=Media Processor API Service
After=network.target

[Service]
Type=simple
User=sharvinzlife
Group=sharvinzlife
WorkingDirectory=/home/sharvinzlife/media-processor
EnvironmentFile=/home/sharvinzlife/media-processor/.env
Environment=PATH=/home/sharvinzlife/media-processor/python_core/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/sharvinzlife/media-processor/python_core/venv/bin/python /home/sharvinzlife/media-processor/python_core/api_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /tmp/media-processor-ui.service << 'EOF'
[Unit]
Description=Media Processor Web UI
After=network.target media-processor-api.service

[Service]
Type=simple
User=sharvinzlife
Group=sharvinzlife
WorkingDirectory=/home/sharvinzlife/media-processor/web-app
EnvironmentFile=/home/sharvinzlife/media-processor/.env
Environment=NODE_ENV=production
Environment=PORT=3005
ExecStart=/usr/bin/node /home/sharvinzlife/media-processor/web-app/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Copy service files
sudo cp /tmp/media-processor-py.service /etc/systemd/system/
sudo cp /tmp/media-processor-api.service /etc/systemd/system/
sudo cp /tmp/media-processor-ui.service /etc/systemd/system/

# Clean up temp files
rm /tmp/media-processor-*.service

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable services for auto-start
sudo systemctl enable media-processor-py.service
sudo systemctl enable media-processor-api.service
sudo systemctl enable media-processor-ui.service

# Start services
sudo systemctl start media-processor-py.service
sudo systemctl start media-processor-api.service
sudo systemctl start media-processor-ui.service

echo "Services updated! Checking status..."
sleep 3

# Check status
sudo systemctl status media-processor-py.service media-processor-api.service media-processor-ui.service --no-pager

echo ""
echo "✅ Services should now start automatically on boot!"
echo "🔧 If services fail, check logs with: journalctl -u media-processor-py.service -f"