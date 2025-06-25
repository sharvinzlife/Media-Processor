# 🎯 MCP Command Reference Guide

## Quick Reference: All Available MCP Commands

This guide provides a complete reference of all MCP-enhanced commands and their automatic behaviors in your Media Processor development environment.

---

## 🧠 Memory Server Commands

### `/remember` - Store Information
**Usage**: Store any important information with semantic search capabilities

```bash
# Basic usage
/remember 'The Media Processor uses SMB for network file transfers'

# With tags for organization
/remember 'React components use Tailwind CSS for styling' --tags frontend,styling

# With importance level (1-10)
/remember 'Database backup runs daily at 2 AM' --importance 9
```

**Automatic Behaviors**:
- ✅ **Semantic Indexing**: Automatically creates searchable embeddings
- ✅ **Context Enhancement**: Adds timestamp and metadata
- ✅ **Conflict Detection**: Warns about similar existing memories
- ✅ **Tag Suggestions**: Recommends relevant tags based on content

**Real Examples**:
```bash
/remember 'Fixed emoji rendering by removing gradient-text CSS class from header components'
/remember 'Malayalam track extraction saves 40-60% file size by removing unwanted audio tracks'
/remember 'Test coverage threshold is 80% for all frontend components'
```

### `/recall` - Search Memories
**Usage**: Find relevant stored information using natural language

```bash
# Basic search
/recall 'emoji rendering issues'

# Specific search with limits
/recall 'database configuration' --limit 3

# High-precision search
/recall 'performance optimization' --min-similarity 0.8
```

**Automatic Behaviors**:
- 🔍 **Semantic Search**: Finds conceptually related information
- 📊 **Relevance Scoring**: Ranks results by similarity
- 🏷️ **Tag Filtering**: Includes relevant tagged content
- ⏰ **Recency Boost**: Prioritizes recent information

**Claude's Automatic Usage**:
```bash
You: "How do I fix the dashboard stats showing zero?"
Claude: [automatically recalls] "Found previous fix: dashboard statistics display issues v3.3.8..."
```

### `/list-memories` - Browse Stored Information
**Usage**: View all stored memories with filtering options

```bash
# List all memories
/list-memories

# Filter by tags
/list-memories --tags frontend,react

# Limit results
/list-memories --limit 20
```

### `/memory-stats` - Memory Analytics
**Usage**: Get insights about your stored knowledge

```bash
/memory-stats
```

**Returns**:
- Total memories count
- Most used tags
- Average importance levels
- Storage location and size

---

## 📁 Filesystem Server Integration

### Automatic File Operations

**Claude automatically accesses**:
- `./web-app/` - Frontend React application
- `./python_core/` - Backend Python services
- `./mcp-servers/` - MCP server implementations
- `./docs/` - Documentation and guides
- `./lib/` - Shared libraries and utilities

**Automatic Behaviors**:
```bash
You: "Update the Settings component"
Claude: [automatically]:
- Locates: web-app/frontend/src/features/settings/Settings.tsx
- Reviews: Related component files
- Checks: Test files and dependencies
- Suggests: Implementation approach
```

### File Pattern Recognition

**Claude automatically understands**:
- **Component Structure**: React components and their tests
- **API Patterns**: Endpoint definitions and client code
- **Configuration Files**: Environment variables and settings
- **Build Artifacts**: Package.json, requirements.txt, configs

---

## 📦 GitHub Server Integration

### Automatic Repository Operations

**No manual GitHub API calls needed!** Claude automatically:

```bash
You: "Review recent changes"
Claude: [automatically]:
- Fetches latest commits
- Analyzes file changes
- Reviews commit messages
- Identifies patterns and impacts
```

### Git Workflow Enhancement

```bash
You: "Check if this conflicts with recent work"
Claude: [automatically]:
- Scans recent commits in affected files
- Identifies potential merge conflicts
- Suggests resolution strategies
- Reviews related pull requests
```

**Available Automatic Operations**:
- ✅ **Commit Analysis**: Reviews changes and impacts
- ✅ **Branch Comparison**: Identifies differences and conflicts
- ✅ **Issue Tracking**: Links code changes to issues
- ✅ **Release Planning**: Analyzes changes for version bumps

---

## 🚀 Development Workflow Commands

### `/dev-server` - Start Development Environment
```bash
/dev-server
```

**Automatic Actions**:
1. Starts Python API server (port 5001)
2. Starts frontend dev server (port 5173)
3. Starts main web app (port 3005)
4. Reports status and URLs

### `/test-all` - Comprehensive Testing
```bash
/test-all
```

**Automatic Actions**:
1. Frontend: `npm run test:coverage`
2. Backend: `python -m pytest tests/ -v --cov=.`
3. Integration: Cross-component testing
4. Reports: Coverage analysis and failures

### `/lint` - Code Quality Check
```bash
/lint
```

**Automatic Actions**:
1. Frontend: ESLint + TypeScript checking
2. Backend: Flake8 + MyPy validation
3. Formatting: Prettier and Black formatting
4. Reports: All quality issues found

### `/build` - Production Build
```bash
/build
```

**Automatic Actions**:
1. Frontend: Production build with Vite
2. Backend: Dependency validation
3. Assets: Optimization and compression
4. Testing: Build validation tests

### `/health-check` - System Diagnostics
```bash
/health-check
```

**Automatic Checks**:
- ✅ Service status (Python, UI, API servers)
- ✅ Port availability (3005, 5001, 5173)
- ✅ Dependency versions (Node.js, Python, Docker)
- ✅ Disk space and memory usage
- ✅ Configuration validation

---

## 🔧 Service Management Commands

### `/restart-services` - Service Management
```bash
/restart-services
```

**Automatic Actions**:
1. Stops all media-processor services
2. Waits for clean shutdown
3. Restarts services in proper order
4. Validates startup success

### `/check-logs` - Log Analysis
```bash
/check-logs
```

**Automatic Actions**:
1. Fetches recent logs from all services
2. Highlights errors and warnings
3. Identifies common patterns
4. Suggests troubleshooting steps

### `/stop-services` - Clean Shutdown
```bash
/stop-services
```

**Automatic Actions**:
1. Gracefully stops Python processor
2. Stops web UI service
3. Stops API server
4. Confirms clean shutdown

---

## 🛠️ Maintenance Commands

### `/update-deps` - Dependency Management
```bash
/update-deps
```

**Automatic Actions**:
1. Updates npm packages (frontend + main)
2. Updates Python packages in virtual environment
3. Checks for security vulnerabilities
4. Reports outdated dependencies

### `/clean-build` - Cleanup Operations
```bash
/clean-build
```

**Automatic Actions**:
1. Removes build artifacts and caches
2. Cleans Python __pycache__ directories
3. Removes temporary files
4. Frees up disk space

### `/fix-perms` - Permission Repair
```bash
/fix-perms
```

**Automatic Actions**:
1. Makes shell scripts executable
2. Fixes Python script permissions
3. Corrects directory permissions
4. Validates access rights

---

## 📊 Git Workflow Commands

### `/git-status` - Enhanced Git Information
```bash
/git-status
```

**Automatic Information**:
- Current branch and status
- Recent commits (last 5)
- Modified and staged files
- Branch tracking information
- Uncommitted changes summary

### `/commit-frontend` - Smart Frontend Commits
```bash
/commit-frontend
```

**Automatic Actions**:
1. Stages all frontend-related files
2. Includes TODO_FRONTEND.md updates
3. Generates descriptive commit message
4. Adds Claude Code attribution

### `/commit-backend` - Smart Backend Commits
```bash
/commit-backend
```

**Automatic Actions**:
1. Stages Python and service files
2. Includes configuration changes
3. Generates descriptive commit message
4. Adds Claude Code attribution

---

## 🧪 Testing Commands

### `/test-mcp` - MCP Server Validation
```bash
/test-mcp
```

**Automatic Tests**:
- ✅ MCP server configuration
- ✅ Memory server connectivity
- ✅ GitHub token validation
- ✅ Filesystem access permissions
- ✅ Command availability

### `/remember-project` - Store Project Knowledge
```bash
/remember-project
```

**Automatically Stores**:
- Complete project architecture overview
- Technology stack and dependencies
- Key features and capabilities
- Development workflow patterns

### `/remember-architecture` - Store Technical Decisions
```bash
/remember-architecture
```

**Automatically Stores**:
- Frontend: React 18 + TypeScript + Vite stack
- Backend: Python 3.11 + Flask + SQLite
- State management and testing approaches
- Service architecture and deployment

---

## 🎯 Automatic Behavior Patterns

### Context-Aware Command Execution

**Claude automatically chooses the right commands based on context:**

```bash
You: "Something's wrong with the frontend"
Claude: [automatically runs]:
1. /git-status (check for uncommitted changes)
2. /health-check (verify services)
3. /check-logs (examine error logs)
4. /test-all (run tests to identify issues)
```

### Proactive Problem Detection

**Claude automatically notices and suggests:**

```bash
# When you start working
Claude: "I notice uncommitted changes in Settings.tsx. Should we commit them first?"

# During development
Claude: "Test coverage dropped below 80%. Running /test-all to see which tests are missing."

# Before deployment
Claude: "Services were restarted recently. Running /health-check to ensure stability."
```

### Smart Command Chaining

**Commands automatically trigger related operations:**

```bash
/build → automatically runs /lint → then /test-all → then validates assets
/restart-services → automatically runs /health-check → then /check-logs
/update-deps → automatically runs /test-all → then checks for breaking changes
```

---

## 💡 Pro Tips for Maximum Efficiency

### 1. **Memory-First Development**
```bash
# Store important decisions immediately
/remember 'We decided to use Recharts for data visualization instead of Chart.js'

# Claude will automatically recall this when working on charts
You: "Add a new chart component"
Claude: [recalls] "Using Recharts as per previous decision..."
```

### 2. **Context-Rich Problem Solving**
```bash
# Instead of: "Fix this bug"
# Do: "The dashboard stats are showing zero values again"
# Claude automatically recalls previous fixes and applies them
```

### 3. **Workflow Automation**
```bash
# Single command for complete development cycle
You: "Prepare for code review"
Claude: [automatically]:
1. /lint (check code quality)
2. /test-all (run comprehensive tests)
3. /git-status (review changes)
4. /build (validate production build)
```

### 4. **Team Knowledge Sharing**
```bash
# Store team patterns for automatic reuse
/remember 'Code review checklist: TypeScript compliance, test coverage >80%, mobile responsiveness, accessibility'
```

---

## 🔄 Command Combinations for Common Workflows

### **Feature Development Cycle**
```bash
1. /recall 'similar feature patterns'
2. [Development work]
3. /lint && /test-all
4. /commit-frontend
5. /remember 'Feature X implementation notes'
```

### **Bug Investigation**
```bash
1. /recall 'similar bug fixes'
2. /check-logs
3. /health-check
4. [Bug fix implementation]
5. /test-all
6. /remember 'Bug fix: root cause and solution'
```

### **Deployment Preparation**
```bash
1. /git-status
2. /test-all
3. /build
4. /health-check
5. /remember 'Deployment checklist completed'
```

---

This command reference transforms your development experience from manual task execution to **intelligent, automated, context-aware development** where Claude proactively assists based on your project's specific patterns and history! 🚀