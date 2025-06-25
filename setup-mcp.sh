#!/bin/bash
# Setup MCP Servers for Media Processor Development

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Setting up MCP servers for Media Processor..."

# Ensure we're in the project directory
cd "$PROJECT_DIR"

# Install MCP server dependencies if needed
if [ ! -d "node_modules/@modelcontextprotocol" ]; then
    echo "📦 Installing MCP server dependencies..."
    npm install @modelcontextprotocol/server-github @modelcontextprotocol/server-filesystem --save-dev
fi

# Setup Python memory server virtual environment if needed  
if [ ! -d "mcp-servers/memory-venv" ]; then
    echo "🐍 Setting up Python virtual environment for memory server..."
    python3 -m venv ./mcp-servers/memory-venv
    ./mcp-servers/memory-venv/bin/pip install fastmcp chromadb sentence-transformers mcp
fi

# Add project-scoped MCP servers
echo "⚙️  Configuring project-scoped MCP servers..."

# Remove any existing servers first
claude mcp remove github-server 2>/dev/null || true
claude mcp remove filesystem-server 2>/dev/null || true

# Add GitHub server
if [ -f "./node_modules/.bin/mcp-server-github" ]; then
    claude mcp add github-server -s project ./node_modules/.bin/mcp-server-github
    echo "✅ Added GitHub MCP server"
else
    echo "⚠️  GitHub MCP server binary not found"
fi

# Add Filesystem server
if [ -f "./node_modules/.bin/mcp-server-filesystem" ]; then
    claude mcp add filesystem-server -s project ./node_modules/.bin/mcp-server-filesystem  
    echo "✅ Added Filesystem MCP server"
else
    echo "⚠️  Filesystem MCP server binary not found"
fi

# Add user-scoped memory server
echo "🧠 Configuring memory server..."
claude mcp remove simple-memory 2>/dev/null || true
claude mcp add simple-memory -s user "./mcp-servers/memory-venv/bin/python" "./mcp-servers/simple-memory-server.py"
echo "✅ Added Memory MCP server"

# Create logs directory
mkdir -p logs

# Update .env with MCP configuration if needed
if ! grep -q "GITHUB_PERSONAL_ACCESS_TOKEN" .env 2>/dev/null; then
    echo "" >> .env
    echo "# MCP Server Configuration" >> .env
    echo "GITHUB_PERSONAL_ACCESS_TOKEN=\"\"  # Add your GitHub token for MCP GitHub server" >> .env
    echo "📝 Added MCP configuration to .env file"
fi

# Show configuration status
echo ""
echo "🎯 MCP Server Setup Complete!"
echo ""
echo "📋 Configured servers:"
claude mcp list

echo ""
echo "🔧 Next steps:"
echo "1. Add your GitHub Personal Access Token to .env file"
echo "2. Use the following commands in Claude:"
echo "   • /remember 'important information'"
echo "   • /recall 'search for something'"
echo "   • /list-memories"
echo "   • /dev-workflow (for development commands)"
echo ""
echo "3. Test the setup:"
echo "   ./test-mcp-setup.sh"
echo ""
echo "✨ Your development environment is now supercharged with MCP!"