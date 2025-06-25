# Development Workflow Commands

These are custom commands for the Media Processor project development workflow.

## Quick Actions

### /lint
Run linting and type checking for the entire project:
```bash
cd web-app/frontend && npm run lint && npm run test:run
cd ../../python_core && python -m flake8 . && python -m mypy .
```

### /build
Build the frontend and test all components:
```bash
cd web-app/frontend && npm run build
cd ../.. && ./test-github-deployment.sh
```

### /test-all
Run comprehensive testing across all components:
```bash
cd web-app/frontend && npm run test:coverage
cd ../../python_core && python -m pytest tests/ -v --cov=.
```

### /dev-server
Start all development servers:
```bash
# Start Python API server
cd python_core && ./run_api_server.sh &

# Start frontend dev server 
cd web-app/frontend && npm run dev &

# Start main web app
cd web-app && npm run dev &

echo "🚀 All dev servers started!"
echo "Frontend: http://localhost:5173"
echo "Web App: http://localhost:3005" 
echo "Python API: http://localhost:5001"
```

### /stop-services
Stop all media processor services:
```bash
sudo systemctl stop media-processor-py.service
sudo systemctl stop media-processor-ui.service
sudo systemctl stop media-processor-api.service
echo "✋ All services stopped"
```

### /restart-services
Restart all media processor services:
```bash
sudo systemctl restart media-processor-py.service
sudo systemctl restart media-processor-ui.service
sudo systemctl restart media-processor-api.service
echo "🔄 All services restarted"
```

### /check-logs
View recent logs from all services:
```bash
echo "=== Python Processor Logs ==="
sudo journalctl -u media-processor-py.service -n 20 --no-pager

echo -e "\n=== Web UI Logs ==="
sudo journalctl -u media-processor-ui.service -n 20 --no-pager

echo -e "\n=== API Server Logs ==="
sudo journalctl -u media-processor-api.service -n 20 --no-pager
```

## Development Helpers

### /fix-perms
Fix file permissions for the project:
```bash
chmod +x bin/*.sh
chmod +x *.sh
chmod +x python_core/*.py
chmod +x mcp-servers/*.py
echo "✅ File permissions fixed"
```

### /clean-build
Clean all build artifacts:
```bash
rm -rf web-app/frontend/dist/
rm -rf web-app/frontend/node_modules/.cache/
rm -rf node_modules/.cache/
rm -rf python_core/__pycache__/
rm -rf python_core/**/__pycache__/
echo "🧹 Build artifacts cleaned"
```

### /update-deps
Update all project dependencies:
```bash
echo "Updating npm dependencies..."
npm update

echo "Updating frontend dependencies..."
cd web-app/frontend && npm update && cd ../..

echo "Updating Python dependencies..."
cd python_core && source .venv/bin/activate && pip install --upgrade -r requirements.txt && cd ..

echo "📦 Dependencies updated"
```

## Memory Commands

### /remember-project
Store important project information in memory:
```
Remember that this is the Media Processor project - a Malayalam-focused media processing system that:
- Automatically processes and organizes media files
- Has a React+TypeScript frontend with Tailwind CSS
- Uses Python for core processing with Flask API
- Features real-time dashboard and database management
- Supports SMB network transfers and language extraction
- Has comprehensive testing with Vitest and pytest
- Uses MCP servers for enhanced development workflow
```

### /remember-architecture
Store architecture decisions in memory:
```
Remember the Media Processor architecture:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Python 3.11 + Flask + SQLite
- State Management: Zustand + React Query
- Testing: Vitest + React Testing Library + pytest
- Services: systemd services for processing, UI, and API
- MCP Servers: GitHub, Filesystem, Memory, Puppeteer
- Configuration: Unified .env system
- Deployment: Cross-platform (Linux/macOS/Windows)
```

## Git Workflow

### /git-status
Comprehensive git status with useful information:
```bash
echo "=== Git Status ==="
git status

echo -e "\n=== Recent Commits ==="
git log --oneline -5

echo -e "\n=== Modified Files ==="
git diff --name-only

echo -e "\n=== Staged Files ==="
git diff --cached --name-only

echo -e "\n=== Branch Info ==="
git branch -v
```

### /commit-frontend
Commit frontend changes with proper message:
```bash
git add web-app/frontend/
git add TODO_FRONTEND.md
git commit -m "Frontend: $(date +%Y-%m-%d) development updates

🎨 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### /commit-backend
Commit backend changes with proper message:
```bash
git add python_core/
git add *.service
git commit -m "Backend: $(date +%Y-%m-%d) development updates

🐍 Generated with Claude Code  
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Quick Diagnostics

### /health-check
Check system health:
```bash
echo "=== System Health Check ==="

echo "Node.js: $(node --version)"
echo "Python: $(python3 --version)"
echo "Docker: $(docker --version)"

echo -e "\n=== Service Status ==="
systemctl is-active media-processor-py.service || echo "Python service: inactive"
systemctl is-active media-processor-ui.service || echo "UI service: inactive" 
systemctl is-active media-processor-api.service || echo "API service: inactive"

echo -e "\n=== Port Status ==="
ss -tlnp | grep -E ':(3005|5001|5173)' || echo "No services listening on dev ports"

echo -e "\n=== Disk Space ==="
df -h . | tail -1

echo -e "\n=== Memory Usage ==="
free -h | grep Mem
```

### /test-mcp
Test MCP server functionality:
```bash
echo "=== Testing MCP Servers ==="
claude mcp list

echo -e "\n=== Testing Memory Server ==="
curl -s http://localhost:8000/health || echo "Memory server not responding"

echo -e "\n=== Testing GitHub Access ==="
test -n "$GITHUB_PERSONAL_ACCESS_TOKEN" && echo "GitHub token configured" || echo "⚠️  GitHub token missing"
```