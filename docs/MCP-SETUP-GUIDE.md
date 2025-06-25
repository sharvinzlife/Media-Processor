# 🔧 MCP Setup and Configuration Guide

## Complete Setup Instructions for MCP-Enhanced Development

This guide provides step-by-step instructions for setting up and configuring MCP servers in your development environment.

---

## 🚀 Quick Setup (Recommended)

### **One-Command Setup**
```bash
./setup-mcp.sh
```

This automated script handles everything:
- ✅ Installs all MCP server dependencies
- ✅ Creates Python virtual environment for memory server
- ✅ Configures project-scoped MCP servers
- ✅ Sets up user-scoped memory server
- ✅ Creates necessary directories and permissions
- ✅ Validates the complete setup

### **Validation**
```bash
./test-mcp-setup.sh
```

---

## 📋 Manual Setup (Step-by-Step)

### **Prerequisites**
```bash
# Check system requirements
node --version    # >= 16.0.0
python3 --version # >= 3.8
docker --version  # Optional, for advanced features
```

### **Step 1: Install MCP Server Dependencies**
```bash
# Install Node.js MCP servers
npm install @modelcontextprotocol/server-github @modelcontextprotocol/server-filesystem --save-dev

# Verify installation
ls node_modules/.bin/mcp-server-*
```

### **Step 2: Setup Python Memory Server**
```bash
# Create virtual environment
python3 -m venv ./mcp-servers/memory-venv

# Activate and install dependencies
source ./mcp-servers/memory-venv/bin/activate
pip install fastmcp chromadb sentence-transformers mcp

# Test memory server
./mcp-servers/memory-venv/bin/python ./mcp-servers/simple-memory-server.py --help
```

### **Step 3: Configure Project MCP Servers**
```bash
# Add GitHub server (project-scoped)
claude mcp add github-server -s project ./node_modules/.bin/mcp-server-github

# Add Filesystem server (project-scoped)
claude mcp add filesystem-server -s project ./node_modules/.bin/mcp-server-filesystem

# Verify project configuration
cat .mcp.json
```

### **Step 4: Configure User MCP Servers**
```bash
# Add Memory server (user-scoped)
claude mcp add simple-memory -s user "./mcp-servers/memory-venv/bin/python" "./mcp-servers/simple-memory-server.py"

# Verify user configuration
claude mcp list
```

### **Step 5: Environment Configuration**
```bash
# Add GitHub token to .env (required for GitHub server)
echo 'GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"' >> .env

# Create logs directory
mkdir -p logs

# Set proper permissions
chmod +x mcp-servers/*.py
chmod +x *.sh
```

---

## 🔧 Configuration Details

### **Project-Scoped Configuration (.mcp.json)**

```json
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
        "./lib"
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
    }
  }
}
```

### **User-Scoped Configuration**
Located in `~/.claude/config/` (managed by Claude CLI):

```bash
# View user configuration
claude mcp list

# Example output:
simple-memory: ./mcp-servers/memory-venv/bin/python ./mcp-servers/simple-memory-server.py
```

### **Environment Variables (.env)**
```bash
# MCP Server Configuration
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"  # Your GitHub token

# Memory Server Settings (optional)
MEMORY_DATA_DIR="/home/user/.claude/memory"              # Custom memory location
MEMORY_SIMILARITY_THRESHOLD="0.3"                       # Search sensitivity
MEMORY_MAX_RESULTS="10"                                  # Default search limit

# Puppeteer Server Settings (optional)
PUPPETEER_HEADLESS="true"                               # Headless browser mode
PUPPETEER_TIMEOUT="30000"                               # Request timeout (ms)
```

---

## 🛠️ Advanced Configuration

### **Custom Memory Server Configuration**
```bash
# Create custom memory server with specific settings
cat > mcp-servers/custom-memory-config.py << 'EOF'
import os
os.environ['MEMORY_DATA_DIR'] = '/custom/path/memory'
os.environ['SIMILARITY_THRESHOLD'] = '0.5'
# Import and run memory server with custom settings
EOF
```

### **GitHub Server Advanced Setup**
```bash
# Create GitHub-specific environment file
cat > .env.github << 'EOF'
GITHUB_PERSONAL_ACCESS_TOKEN="your_token"
GITHUB_API_URL="https://api.github.com"
GITHUB_RATE_LIMIT="5000"
EOF

# Update .mcp.json to use environment file
# (Modify env section to load from .env.github)
```

### **Filesystem Server Path Customization**
```bash
# Edit .mcp.json to include specific paths
{
  "filesystem-server": {
    "args": [
      "./web-app/frontend/src",    # Only frontend source
      "./python_core/modules",     # Only Python modules
      "./docs",                    # Documentation
      "./.claude/commands"         # Custom commands
    ]
  }
}
```

---

## 🔍 Troubleshooting

### **Common Issues and Solutions**

#### **1. MCP Server Not Found**
```bash
# Problem: "./node_modules/.bin/mcp-server-github not found"
# Solution: Reinstall MCP packages
npm install @modelcontextprotocol/server-github --save-dev

# Verify binary exists
ls -la node_modules/.bin/mcp-server-*
```

#### **2. Memory Server Python Dependencies**
```bash
# Problem: "ModuleNotFoundError: No module named 'chromadb'"
# Solution: Reinstall in virtual environment
source ./mcp-servers/memory-venv/bin/activate
pip install --upgrade fastmcp chromadb sentence-transformers mcp

# Test imports
python -c "import chromadb, sentence_transformers; print('Dependencies OK')"
```

#### **3. GitHub Token Issues**
```bash
# Problem: "GitHub API authentication failed"
# Solution: Verify token in .env file
grep GITHUB_PERSONAL_ACCESS_TOKEN .env

# Test token manually
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user
```

#### **4. Permission Denied Errors**
```bash
# Problem: Permission denied executing MCP servers
# Solution: Fix file permissions
chmod +x mcp-servers/*.py
chmod +x node_modules/.bin/mcp-server-*
chmod +x *.sh

# Verify permissions
ls -la mcp-servers/*.py
```

#### **5. Memory Server Startup Issues**
```bash
# Problem: Memory server fails to start
# Solution: Check Python environment and dependencies
./mcp-servers/memory-venv/bin/python --version
./mcp-servers/memory-venv/bin/python -c "import sys; print(sys.path)"

# Test server directly
./mcp-servers/memory-venv/bin/python ./mcp-servers/simple-memory-server.py
```

#### **6. Claude MCP Configuration Issues**
```bash
# Problem: "MCP server configuration invalid"
# Solution: Validate JSON configuration
python3 -m json.tool .mcp.json

# Reset configuration if needed
rm .mcp.json
./setup-mcp.sh
```

### **Debug Mode**
```bash
# Enable MCP debugging
export MCP_DEBUG=1

# Run Claude with debug information
claude --mcp-debug

# Check MCP server logs
tail -f logs/memory-server.log
```

---

## 📊 Validation and Testing

### **Comprehensive Test Suite**
```bash
# Run complete validation
./test-mcp-setup.sh

# Individual component tests
claude mcp list                           # Test MCP configuration
./mcp-servers/memory-venv/bin/python -c "import chromadb"  # Test dependencies
curl -s http://localhost:8000/health      # Test memory server (if running)
python3 -m json.tool .mcp.json           # Validate JSON configuration
```

### **Performance Testing**
```bash
# Memory server performance test
./mcp-servers/memory-venv/bin/python << 'EOF'
from mcp_servers.simple_memory_server import SimpleMemoryServer
import time

server = SimpleMemoryServer()
start_time = time.time()

# Store test memories
for i in range(100):
    # Performance test code here
    pass

print(f"Performance test completed in {time.time() - start_time:.2f}s")
EOF
```

### **Integration Testing**
```bash
# Test MCP integration with Claude
echo "Testing MCP integration..."

# Test memory storage and retrieval
# (This would be done interactively with Claude)
```

---

## 🔄 Maintenance and Updates

### **Regular Maintenance Tasks**

#### **Weekly Tasks**
```bash
# Update MCP server dependencies
npm update @modelcontextprotocol/server-github @modelcontextprotocol/server-filesystem

# Update Python dependencies
source ./mcp-servers/memory-venv/bin/activate
pip install --upgrade fastmcp chromadb sentence-transformers mcp

# Validate configuration
./test-mcp-setup.sh
```

#### **Monthly Tasks**
```bash
# Clean memory server data (optional)
# rm -rf ~/.claude/memory/chroma/*

# Backup memory data
tar -czf memory-backup-$(date +%Y%m%d).tar.gz ~/.claude/memory/

# Review and cleanup stored memories
# (Use Claude's /memory-stats and /list-memories commands)
```

### **Version Updates**
```bash
# Check for MCP server updates
npm outdated @modelcontextprotocol/server-github @modelcontextprotocol/server-filesystem

# Update to latest versions
npm install @modelcontextprotocol/server-github@latest @modelcontextprotocol/server-filesystem@latest --save-dev

# Revalidate setup after updates
./test-mcp-setup.sh
```

---

## 🚀 Team Setup Instructions

### **For Team Leaders**

#### **1. Repository Setup**
```bash
# Ensure MCP configuration is in version control
git add .mcp.json
git add setup-mcp.sh test-mcp-setup.sh
git add docs/MCP-*.md
git commit -m "Add MCP server configuration for team"
```

#### **2. Team Documentation**
```bash
# Create team-specific MCP guide
cp docs/MCP-SETUP-GUIDE.md docs/TEAM-MCP-SETUP.md

# Add team-specific GitHub token instructions
# Add team coding standards to memory commands
# Document team-specific workflow patterns
```

### **For Team Members**

#### **1. Individual Setup**
```bash
# Clone repository
git clone <repository-url>
cd media-processor

# Run automated setup
./setup-mcp.sh

# Add personal GitHub token
echo 'GITHUB_PERSONAL_ACCESS_TOKEN="your_personal_token"' >> .env

# Validate setup
./test-mcp-setup.sh
```

#### **2. Team Memory Initialization**
```bash
# Store team patterns (do this in Claude)
/remember 'Team uses TypeScript strict mode for all new code'
/remember 'Code review requires: tests, TypeScript compliance, mobile responsiveness'
/remember 'Deployment checklist: tests pass, build succeeds, staging validation'
```

---

## 📈 Performance Optimization

### **Memory Server Optimization**
```bash
# Use faster sentence transformer model (optional)
export SENTENCE_TRANSFORMER_MODEL="all-MiniLM-L6-v2"  # Default (fast)
# export SENTENCE_TRANSFORMER_MODEL="all-mpnet-base-v2"  # More accurate (slower)

# Adjust similarity thresholds for better results
export MEMORY_SIMILARITY_THRESHOLD="0.3"  # More results (default)
# export MEMORY_SIMILARITY_THRESHOLD="0.7"  # Fewer, more relevant results
```

### **GitHub Server Optimization**
```bash
# Set rate limiting to avoid API limits
export GITHUB_RATE_LIMIT="4000"  # Leave headroom for other tools

# Cache GitHub responses (if supported)
export GITHUB_CACHE_TTL="300"    # 5 minutes cache
```

### **Filesystem Server Optimization**
```bash
# Limit filesystem access to essential directories only
# Edit .mcp.json to include only necessary paths
# This reduces filesystem scanning time
```

---

This comprehensive setup guide ensures your MCP-enhanced development environment is properly configured, optimized, and maintainable for both individual and team development workflows! 🎯