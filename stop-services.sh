#!/bin/bash

# Stop Services Script for Media Processor
# Stops Python API, media processor, and optionally web interface

set -e  # Exit on any error

# Check for --keep-web flag
KEEP_WEB=false
if [[ "$1" == "--keep-web" ]]; then
    KEEP_WEB=true
    echo "Stopping services (keeping web interface running)..."
else
    echo "Stopping all Media Processor Services..."
fi

# Function to kill process by name pattern
kill_process() {
    local pattern="$1"
    local description="$2"
    
    local pids=$(pgrep -f "$pattern" || true)
    if [[ -n "$pids" ]]; then
        echo "Stopping $description..."
        kill $pids
        sleep 2
        
        # Force kill if still running
        local remaining_pids=$(pgrep -f "$pattern" || true)
        if [[ -n "$remaining_pids" ]]; then
            echo "Force stopping $description..."
            kill -9 $remaining_pids || true
        fi
        echo "$description stopped"
    else
        echo "$description is not running"
    fi
}

# Stop Python API server
kill_process "api_server.py" "Python API Server"

# Stop Media Processor
kill_process "media_processor.py" "Media Processor"

# Stop Web Interface unless --keep-web flag is set
if [[ "$KEEP_WEB" == false ]]; then
    kill_process "node server.js" "Web Interface"
fi

echo ""
if [[ "$KEEP_WEB" == true ]]; then
    echo "✅ Python services stopped (web interface still running)"
    echo "🌐 Web Interface: http://localhost:3005"
else
    echo "✅ All services stopped successfully!"
fi