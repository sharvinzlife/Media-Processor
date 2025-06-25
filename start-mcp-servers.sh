#!/bin/bash
# Start MCP Servers for Media Processor Development

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_SERVER_PORT=8000

echo "🚀 Starting MCP servers for Media Processor..."

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
    echo "✅ Loaded environment variables"
else
    echo "⚠️  .env file not found, using defaults"
fi

# Check if memory server is already running
if curl -s "http://localhost:$MEMORY_SERVER_PORT/health" > /dev/null 2>&1; then
    echo "✅ Memory server already running on port $MEMORY_SERVER_PORT"
else
    echo "🧠 Starting Memory server on port $MEMORY_SERVER_PORT..."
    
    # Start memory server in background
    cd "$PROJECT_DIR"
    nohup ./mcp-servers/memory-venv/bin/python ./mcp-servers/memory-server.py $MEMORY_SERVER_PORT > logs/memory-server.log 2>&1 &
    MEMORY_PID=$!
    
    # Wait for server to start
    sleep 3
    
    if curl -s "http://localhost:$MEMORY_SERVER_PORT/health" > /dev/null 2>&1; then
        echo "✅ Memory server started successfully (PID: $MEMORY_PID)"
        echo $MEMORY_PID > /tmp/memory-server.pid
    else
        echo "❌ Failed to start memory server"
        cat logs/memory-server.log
        exit 1
    fi
fi

# Verify MCP configuration
echo "🔍 Verifying MCP configuration..."
claude mcp list

echo "✅ MCP servers status:"
echo "  📊 Memory Server: http://localhost:$MEMORY_SERVER_PORT"
echo "  📁 Filesystem Server: Available via Claude"
echo "  📦 GitHub Server: Available via Claude"
echo "  🌐 Puppeteer Server: Available via Claude"

# Create convenience aliases
echo "💡 Quick test commands:"
echo "  - Test memory: curl http://localhost:$MEMORY_SERVER_PORT/docs"
echo "  - List MCPs: claude mcp list"
echo "  - Stop memory: kill \$(cat /tmp/memory-server.pid)"

# Show useful MCP commands
echo ""
echo "🧠 Memory Server Commands (use in Claude):"
echo "  - remember('Your important info here')"
echo "  - recall('search for information')"
echo "  - list_memories()"
echo "  - memory_stats()"

echo ""
echo "🎯 All MCP servers are ready for development!"