#!/bin/bash
# Test MCP Server Setup for Media Processor

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "🧪 Testing MCP server setup..."

# Test 1: Check MCP configuration
echo "1️⃣  Testing MCP configuration..."
if claude mcp list | grep -q "simple-memory"; then
    echo "✅ Memory server configured"
else
    echo "❌ Memory server not configured"
    exit 1
fi

# Test 2: Check if .mcp.json exists and is valid
echo "2️⃣  Testing project MCP configuration..."
if [ -f ".mcp.json" ]; then
    if python3 -m json.tool .mcp.json > /dev/null 2>&1; then
        echo "✅ Project .mcp.json is valid"
    else
        echo "❌ Project .mcp.json is invalid JSON"
        exit 1
    fi
else
    echo "⚠️  No project .mcp.json found"
fi

# Test 3: Check memory server dependencies
echo "3️⃣  Testing memory server dependencies..."
if [ -d "mcp-servers/memory-venv" ]; then
    if ./mcp-servers/memory-venv/bin/python -c "import chromadb, sentence_transformers" 2>/dev/null; then
        echo "✅ Memory server dependencies installed"
    else
        echo "❌ Memory server dependencies missing"
        exit 1
    fi
else
    echo "❌ Memory server virtual environment not found"
    exit 1
fi

# Test 4: Check GitHub token configuration
echo "4️⃣  Testing GitHub token configuration..."
if grep -q "GITHUB_PERSONAL_ACCESS_TOKEN" .env; then
    if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ] && [ "$GITHUB_PERSONAL_ACCESS_TOKEN" != '""' ]; then
        echo "✅ GitHub token configured"
    else
        echo "⚠️  GitHub token is empty (add your token to .env)"
    fi
else
    echo "⚠️  GitHub token not found in .env"
fi

# Test 5: Check custom commands
echo "5️⃣  Testing custom commands..."
if [ -f ".claude/commands/dev-workflow.md" ]; then
    echo "✅ Development workflow commands available"
else
    echo "❌ Development workflow commands missing"
    exit 1
fi

# Test 6: Validate memory server script
echo "6️⃣  Testing memory server script..."
if ./mcp-servers/memory-venv/bin/python -m py_compile mcp-servers/simple-memory-server.py; then
    echo "✅ Memory server script syntax is valid"
else
    echo "❌ Memory server script has syntax errors"
    exit 1
fi

# Test 7: Check required directories
echo "7️⃣  Testing directory structure..."
for dir in "logs" "mcp-servers" ".claude/commands"; do
    if [ -d "$dir" ]; then
        echo "✅ Directory $dir exists"
    else
        echo "⚠️  Directory $dir missing"
        mkdir -p "$dir"
        echo "📁 Created directory $dir"
    fi
done

# Test 8: Check file permissions
echo "8️⃣  Testing file permissions..."
for file in "setup-mcp.sh" "start-mcp-servers.sh" "mcp-servers/simple-memory-server.py"; do
    if [ -x "$file" ]; then
        echo "✅ $file is executable"
    else
        echo "⚠️  $file is not executable"
        chmod +x "$file"
        echo "🔧 Fixed permissions for $file"
    fi
done

echo ""
echo "🎉 MCP Setup Test Results:"
echo "✅ Basic configuration: PASSED"
echo "✅ Dependencies: PASSED" 
echo "✅ Scripts: PASSED"
echo "✅ Structure: PASSED"

echo ""
echo "🚀 Ready to use MCP servers!"
echo ""
echo "💡 Quick start:"
echo "1. In Claude, type: /remember 'This is my Media Processor project with React frontend and Python backend'"
echo "2. Then try: /recall 'project'"
echo "3. List all memories: /list-memories"
echo "4. See dev commands: /dev-workflow"
echo ""
echo "🔧 Available MCP servers:"
claude mcp list
echo ""
echo "✨ Your MCP-enhanced development environment is ready!"