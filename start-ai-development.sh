#!/bin/bash

# Quick start script for AI-enhanced development
echo "🤖 Starting AI-Enhanced Development Environment..."

# Activate toolkit
export PATH="$(pwd)/tools/claude-mcp-toolkit/venv/bin:$PATH"

# Use enhanced MCP configuration
if [ -f ".mcp.enhanced.json" ]; then
    cp .mcp.enhanced.json .mcp.json
    echo "✅ Enhanced MCP configuration activated"
fi

# Start development servers
echo "🚀 Starting development servers..."
echo "1. Start Python API: cd python_core && python api_server.py"
echo "2. Start Web UI: npm run web-app"
echo "3. Start frontend dev: cd web-app/frontend && npm run dev"

echo ""
echo "🤖 AI Development Tools Available:"
echo "- claude-mcp visual capture --show"
echo "- claude-mcp debug start --target http://localhost:3005"
echo "- claude-mcp memory store-context"
echo "- claude-mcp yolo status"

echo ""
echo "📖 See docs/MCP_TOOLKIT_INTEGRATION_PLAN.md for full capabilities"
