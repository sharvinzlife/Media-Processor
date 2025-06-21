#!/bin/bash

# Fix Media Processor Services

echo "Fixing Media Processor Services..."

# Kill any existing processes using the ports
echo "Killing existing processes on ports 5001 and 3005..."
pkill -f "api_server.py" 2>/dev/null || true
pkill -f "server.js" 2>/dev/null || true
sleep 2

# Check if ports are free
if lsof -i :5001 >/dev/null 2>&1; then
    echo "Port 5001 is still in use. Forcing kill..."
    lsof -t -i :5001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if lsof -i :3005 >/dev/null 2>&1; then
    echo "Port 3005 is still in use. Forcing kill..."
    lsof -t -i :3005 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo "Ports should now be free."
echo ""
echo "To restart services, run:"
echo "  sudo systemctl restart media-processor-api.service"
echo "  sudo systemctl restart media-processor-ui.service"
echo ""
echo "To check service status:"
echo "  sudo systemctl status media-processor-api.service"
echo "  sudo systemctl status media-processor-ui.service"