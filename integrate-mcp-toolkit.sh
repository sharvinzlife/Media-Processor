#!/bin/bash

# Claude MCP Toolkit Integration Script for Media-Processor
# This script sets up the claude-mcp-toolkit integration while preserving existing MCP configuration

set -e

PROJECT_ROOT="/home/sharvinzlife/media-processor"
TOOLKIT_DIR="$PROJECT_ROOT/tools/claude-mcp-toolkit"

echo "🚀 Starting Claude MCP Toolkit Integration..."
echo "Project: Media-Processor"
echo "Location: $PROJECT_ROOT"

# Create tools directory
echo "📁 Creating tools directory..."
mkdir -p "$PROJECT_ROOT/tools"

# Check if toolkit is already cloned
if [ -d "$TOOLKIT_DIR" ]; then
    echo "✅ claude-mcp-toolkit already exists, updating..."
    cd "$TOOLKIT_DIR"
    git pull origin main
else
    echo "📦 Cloning claude-mcp-toolkit..."
    cd "$PROJECT_ROOT/tools"
    git clone https://github.com/sharvinzlife/claude-mcp-toolkit.git
fi

# Install toolkit dependencies
echo "📦 Installing claude-mcp-toolkit dependencies..."
cd "$TOOLKIT_DIR"

# Check if Python virtual environment exists
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install
echo "📦 Installing toolkit in virtual environment..."
source venv/bin/activate
pip install -e .

# Return to project root
cd "$PROJECT_ROOT"

# Backup existing MCP configuration
echo "💾 Backing up existing MCP configuration..."
if [ -f ".mcp.json" ]; then
    cp .mcp.json .mcp.json.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing .mcp.json"
fi

# Initialize toolkit configuration (preserving existing)
echo "⚙️ Initializing MCP toolkit configuration..."
if command -v claude-mcp &> /dev/null; then
    # Use existing claude-mcp if available
    echo "Using system claude-mcp command..."
else
    # Use toolkit's claude-mcp
    echo "Using toolkit's claude-mcp command..."
    export PATH="$TOOLKIT_DIR/venv/bin:$PATH"
fi

# Create enhanced MCP configuration
echo "🔧 Creating enhanced MCP configuration..."
cat > .mcp.enhanced.json << 'EOF'
{
  "mcpServers": {
    "github-server": {
      "type": "stdio",
      "command": "./node_modules/.bin/mcp-server-github",
      "args": [],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "filesystem-server": {
      "type": "stdio", 
      "command": "./node_modules/.bin/mcp-server-filesystem",
      "args": [
        "./web-app",
        "./python_core", 
        "./mcp-servers",
        "./docs",
        "./lib",
        "./tools"
      ],
      "env": {}
    },
    "puppeteer-server": {
      "type": "stdio",
      "command": "./node_modules/.bin/mcp-server-puppeteer",
      "args": [],
      "env": {
        "PUPPETEER_HEADLESS": "true",
        "PUPPETEER_TIMEOUT": "30000"
      }
    },
    "memory-server": {
      "type": "stdio",
      "command": "./mcp-servers/memory-venv/bin/python",
      "args": ["./mcp-servers/simple-memory-server.py"],
      "env": {}
    }
  }
}
EOF

# Create toolkit configuration directory
echo "📁 Creating toolkit configuration directory..."
mkdir -p .claude-mcp/{config,toolsets,logs,data}

# Create media development toolset
echo "🛠️ Creating media development toolset..."
cat > .claude-mcp/toolsets/media-development.yaml << 'EOF'
name: media-development
description: Specialized toolset for media processing development
version: "1.0.0"
tools:
  # Core development tools
  - filesystem/*
  - github/*
  - puppeteer/*
  - memory/*
  
  # Development automation
  - yolo/confirm_operation
  - yolo/audit_log
  
  # Future: Media processing specific tools
  # - media-processor/detect_media_language
  # - media-processor/test_smb_connection
  # - media-processor/process_media_file

restrictions:
  max_file_size: "100MB"
  allowed_extensions: [".py", ".js", ".ts", ".tsx", ".json", ".yaml", ".md", ".txt"]
  forbidden_paths: [".env", "*.key", "*.pem"]
  
safety:
  require_confirmation: ["rm", "delete", "DROP", "truncate"]
  backup_before: ["edit", "modify", "update"]
  dry_run_first: ["process", "migrate", "deploy"]
EOF

# Create basic YOLO configuration  
echo "🎯 Creating YOLO configuration..."
cat > .claude-mcp/config/yolo.yaml << 'EOF'
# YOLO (You Only Live Once) Configuration for Media-Processor
project_id: "media-processor"
trust_level: "restricted"  # Start safe: untrusted -> restricted -> trusted -> privileged

# Operation risk classification
operations:
  low_risk:
    - file_read
    - directory_list
    - status_check
    - log_view
  
  medium_risk:
    - file_edit
    - dependency_install
    - service_restart
    - test_run
    
  high_risk:
    - file_delete
    - database_modify
    - production_deploy
    - system_command

# Auto-confirmation rules
auto_confirm:
  low_risk: true
  medium_risk: false  # Require confirmation initially
  high_risk: false

# Audit and logging
audit:
  enabled: true
  log_level: "INFO"
  retention_days: 30
  backup_before_changes: true

# Project-specific rules
media_processor:
  safe_directories: ["./docs", "./web-app/frontend/src", "./python_core/modules"]
  protected_files: [".env", "*.db", "*.json.backup"]
  auto_test_after_changes: true
  require_confirmation_for: ["SMB operations", "file processing", "database changes"]
EOF

# Create media processor MCP server template
echo "🔧 Creating media processor MCP server template..."
mkdir -p mcp-servers/media-processor
cat > mcp-servers/media-processor/server.py << 'EOF'
#!/usr/bin/env python3
"""
Media Processor MCP Server
Provides AI-accessible tools for media processing operations
"""

import asyncio
import json
import sys
from typing import Dict, Any, List
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from mcp import Tool, Server
    from mcp.types import TextContent
except ImportError:
    print("MCP not installed. Install with: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Import project modules
try:
    from python_core.modules.media.detector import MediaDetector
    from python_core.modules.config.settings import ConfigManager
except ImportError as e:
    print(f"Could not import project modules: {e}", file=sys.stderr)
    print("Make sure you're running from the project root", file=sys.stderr)
    sys.exit(1)

class MediaProcessorMCPServer(Server):
    def __init__(self):
        super().__init__("media-processor")
        self.detector = MediaDetector()
        self.config = ConfigManager()
    
    @Tool("detect_media_info")
    async def detect_media_info(self, filename: str) -> Dict[str, Any]:
        """
        Detect language, media type, and processing recommendations for a media file
        
        Args:
            filename: Name of the media file to analyze
            
        Returns:
            Dictionary with detection results and recommendations
        """
        try:
            result = {
                "filename": filename,
                "language": self.detector.detect_language_from_filename(filename),
                "media_type": self.detector.detect_media_type(filename),
                "processing_recommendations": []
            }
            
            # Add processing recommendations based on detection
            if result["language"] == "malayalam":
                result["processing_recommendations"].append("Extract Malayalam audio tracks only")
                result["processing_recommendations"].append("Extract English subtitle tracks")
                result["processing_recommendations"].append("Remove other language tracks")
            
            return result
            
        except Exception as e:
            return {"error": str(e), "filename": filename}
    
    @Tool("get_config_info") 
    async def get_config_info(self) -> Dict[str, Any]:
        """
        Get current configuration information
        
        Returns:
            Dictionary with configuration details (sensitive data masked)
        """
        try:
            config_info = {
                "source_directory": self.config.get("SOURCE_DIRECTORY", "Not set"),
                "smb_server": self.config.get("SMB_SERVER", "Not set"),
                "smb_share": self.config.get("SMB_SHARE", "Not set"),
                "malayalam_movies_path": self.config.get("MALAYALAM_MOVIES_PATH", "Not set"),
                "english_movies_path": self.config.get("ENGLISH_MOVIES_PATH", "Not set"),
            }
            return config_info
            
        except Exception as e:
            return {"error": str(e)}
    
    @Tool("list_processing_patterns")
    async def list_processing_patterns(self) -> List[Dict[str, str]]:
        """
        List all media processing patterns and their descriptions
        
        Returns:
            List of pattern dictionaries with pattern and description
        """
        try:
            # This would integrate with the actual pattern system
            patterns = [
                {
                    "pattern": "malayalam|mal|ml|kerala|mollywood",
                    "description": "Malayalam content detection",
                    "action": "Extract Malayalam audio + English subtitles only"
                },
                {
                    "pattern": "hindi|bollywood|multi|dual",
                    "description": "Hindi/Bollywood content detection", 
                    "action": "Standard processing without extraction"
                },
                {
                    "pattern": "S\\d{2}E\\d{2}|s\\d{2}e\\d{2}",
                    "description": "TV show episode detection",
                    "action": "Organize into series/season folders"
                }
            ]
            return patterns
            
        except Exception as e:
            return [{"error": str(e)}]

async def main():
    """Main entry point for the MCP server"""
    server = MediaProcessorMCPServer()
    
    # Run the server
    from mcp.server.stdio import stdio_server
    async with stdio_server() as streams:
        await server.run(*streams)

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x mcp-servers/media-processor/server.py

# Update .gitignore to include new toolkit files
echo "📝 Updating .gitignore..."
if ! grep -q "claude-mcp-toolkit" .gitignore; then
    cat >> .gitignore << 'EOF'

# Claude MCP Toolkit
tools/claude-mcp-toolkit/venv/
.claude-mcp/logs/
.claude-mcp/data/
.mcp.json.backup.*
EOF
fi

# Create quick start script
echo "🚀 Creating quick start script..."
cat > start-ai-development.sh << 'EOF'
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
EOF

chmod +x start-ai-development.sh

# Create installation verification script
echo "🧪 Creating verification script..."
cat > verify-mcp-integration.sh << 'EOF'
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
EOF

chmod +x verify-mcp-integration.sh

# Run verification
echo "🧪 Running integration verification..."
./verify-mcp-integration.sh

echo ""
echo "🎉 Claude MCP Toolkit Integration Complete!"
echo ""
echo "📋 What was installed:"
echo "  ✅ Claude MCP Toolkit in tools/claude-mcp-toolkit"
echo "  ✅ Enhanced MCP configuration (.mcp.enhanced.json)"
echo "  ✅ Media development toolset"
echo "  ✅ YOLO configuration (restricted mode)"
echo "  ✅ Media processor MCP server template"
echo "  ✅ Quick start and verification scripts"
echo ""
echo "🚀 Next Steps:"
echo "  1. Run ./start-ai-development.sh to activate AI development environment"
echo "  2. Review docs/MCP_TOOLKIT_INTEGRATION_PLAN.md for full capabilities"
echo "  3. Start with: claude-mcp yolo status"
echo "  4. Try: claude-mcp visual capture --show"
echo ""
echo "🔒 Security: Started with 'restricted' trust level for safety"
echo "📖 Documentation: See docs/MCP_TOOLKIT_INTEGRATION_PLAN.md"
EOF

chmod +x integrate-mcp-toolkit.sh

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Clone and explore claude-mcp-toolkit repository", "status": "completed", "priority": "high"}, {"id": "2", "content": "Analyze the toolkit's features and capabilities", "status": "completed", "priority": "high"}, {"id": "3", "content": "Understand the MCP (Model Context Protocol) implementation", "status": "completed", "priority": "high"}, {"id": "4", "content": "Identify integration points with media-processor project", "status": "completed", "priority": "high"}, {"id": "5", "content": "Create integration plan for automated AI development", "status": "completed", "priority": "high"}]