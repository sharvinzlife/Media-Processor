#!/bin/bash

echo "🔍 Verifying Claude MCP Toolkit Integration..."

# Check toolkit installation
if [ -d "tools/claude-mcp-toolkit" ]; then
    echo "✅ Toolkit directory exists"
else
    echo "❌ Toolkit directory missing"
    exit 1
fi

# Check Python environment
if [ -f "tools/claude-mcp-toolkit/venv/bin/python" ]; then
    echo "✅ Python virtual environment exists"
else
    echo "❌ Python virtual environment missing"
    exit 1
fi

# Check configuration files
if [ -f ".claude-mcp/toolsets/media-development.yaml" ]; then
    echo "✅ Media development toolset configured"
else
    echo "❌ Media development toolset missing"
fi

if [ -f ".claude-mcp/config/yolo.yaml" ]; then
    echo "✅ YOLO configuration exists"
else
    echo "❌ YOLO configuration missing"
fi

# Check MCP server template
if [ -f "mcp-servers/media-processor/server.py" ]; then
    echo "✅ Media processor MCP server template created"
else
    echo "❌ Media processor MCP server template missing"
fi

# Test Python imports
echo "🐍 Testing Python module imports..."
cd tools/claude-mcp-toolkit
source venv/bin/activate
python -c "import mcp; print('✅ MCP module imported successfully')" 2>/dev/null || echo "❌ MCP module import failed"

echo ""
echo "🎉 Integration verification complete!"
echo "Run ./start-ai-development.sh to begin AI-enhanced development"
