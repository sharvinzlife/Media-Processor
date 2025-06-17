#!/bin/bash

# Start Services Script for Media Processor
# Creates all required directories and starts Python API and media processor

echo "Starting Media Processor Services..."

# Create log directory if it doesn't exist
mkdir -p /home/sharvinzlife/media-processor/logs

# Source environment
cd /home/sharvinzlife/media-processor

# Activate Python virtual environment
if [ -f "python_core/venv/bin/activate" ]; then
    source python_core/venv/bin/activate
    echo "Activated Python virtual environment"
else
    echo "Warning: Python virtual environment not found"
fi

# Function to start service if not running
start_if_not_running() {
    local pattern="$1"
    local description="$2"
    local start_command="$3"
    local log_file="$4"
    
    if pgrep -f "$pattern" > /dev/null; then
        echo "$description is already running"
        return 0
    fi
    
    echo "Starting $description..."
    eval "$start_command > $log_file 2>&1 &"
    local pid=$!
    sleep 1
    
    if kill -0 $pid 2>/dev/null; then
        echo "$description started with PID: $pid"
        return 0
    else
        echo "Failed to start $description"
        return 1
    fi
}

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    echo "Loaded environment variables from .env"
fi

# Start Python API server in background
cd python_core
start_if_not_running "api_server.py" "Python API Server" "nohup ./venv/bin/python api_server.py" "../logs/api_server.log"
API_SUCCESS=$?

# Start Media Processor in background  
start_if_not_running "media_processor.py" "Media Processor" "nohup ./venv/bin/python media_processor.py" "../logs/media_processor.log"
PROCESSOR_SUCCESS=$?

# Go back to root directory
cd ..

# Start Web Interface
cd web-app
start_if_not_running "node server.js" "Web Interface" "nohup node server.js" "../logs/web_interface.log"
WEB_SUCCESS=$?

echo ""
if [[ $API_SUCCESS -eq 0 && $PROCESSOR_SUCCESS -eq 0 && $WEB_SUCCESS -eq 0 ]]; then
    echo "✅ All services are running!"
else
    echo "⚠️  Some services failed to start. Check logs for details."
fi

echo ""
echo "🌐 Web Interface: http://localhost:3005"
echo "🔧 Python API: http://localhost:5001"
echo ""
echo "📋 To check status: pgrep -f 'media_processor.py|api_server.py|server.js'"
echo "📋 To stop services: ./stop-services.sh"