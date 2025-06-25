# API Consolidation Plan

## Current State Analysis

### Python Flask API (Port 5001)
**File**: `python_core/api_server.py`

**Endpoints**:
- `/api/status` - Get service status
- `/api/service/<action>` - Control service (start/stop/restart)
- `/api/settings` - Get/update settings
- `/api/smb-settings` - Get SMB settings
- `/api/test-connection` - Test SMB connection
- `/api/file-history` - Get/update file history
- `/api/logs` - Get system logs
- `/api/system-diagnostics` - Get system diagnostics
- `/api/diagnose-smb` - Diagnose SMB issues
- `/api/database/*` - Database management endpoints (if DatabaseManager available)

### Node.js Express Server (Port 3005)
**File**: `web-app/server.js`

**Endpoints**:
- `/api/health` - Health check
- `/api/status` - Get process status (different implementation)
- `/api/logs` - Get logs (different implementation)
- `/api/logs/clear` - Clear logs
- `/api/logs/stream` - Stream logs (SSE)
- `/api/file-history` - Get/update file history (duplicate)
- `/api/stats` - Get statistics
- `/api/stats/add` - Add statistics (duplicate endpoint)
- `/api/test-connection` - Test SMB (duplicate)
- `/api/diagnose-smb` - Diagnose SMB (duplicate)
- `/api/service/start|stop|restart` - Service control (duplicate)
- `/api/diagnostics` - System diagnostics
- `/api/system-diagnostics` - Enhanced diagnostics (duplicate)
- `/api/media/update-counts` - Update media counts
- `/api/smb-settings` - Get SMB settings (duplicate)
- `/api/test-file-managers` - Test file managers

## Issues Identified

1. **Duplicate Endpoints**: Many endpoints exist in both servers with different implementations
2. **Port Confusion**: Two different API servers on different ports
3. **Data Inconsistency**: File history and stats managed differently
4. **Authentication**: No consistent auth mechanism across APIs
5. **Maintenance Burden**: Two codebases to maintain

## Recommended Solution

### Option 1: Python Flask as Primary API (RECOMMENDED)
**Advantages**:
- Already integrated with core media processing logic
- Direct access to Python modules and database
- Better for system operations (service control, file operations)
- More mature implementation with error handling

**Implementation Steps**:
1. Migrate unique Node.js endpoints to Python Flask:
   - `/api/logs/stream` - Add SSE support to Flask
   - `/api/media/update-counts` - Add to Flask
   - `/api/test-file-managers` - Add to Flask

2. Update Node.js server to be a pure static file server:
   - Remove all `/api/*` endpoints
   - Add proxy configuration to forward `/api/*` to Flask on port 5001
   - Keep only static file serving for React app

3. Update frontend to use single API endpoint:
   - Configure axios/fetch to use `/api` prefix
   - Node.js server proxies all `/api` calls to `http://localhost:5001`

### Option 2: Node.js Express as Primary API
**Advantages**:
- Same language as frontend
- Better WebSocket/SSE support
- Easier deployment with frontend

**Disadvantages**:
- Would need to shell out for all Python operations
- Less efficient for file operations
- More complex service management

## Implementation Plan

### Phase 1: Proxy Setup (Immediate)
```javascript
// In web-app/server.js, add:
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy all /api requests to Python Flask
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'API server unavailable' });
  }
}));
```

### Phase 2: Endpoint Migration
1. Add missing endpoints to Flask API
2. Remove duplicate endpoints from Node.js
3. Test all functionality

### Phase 3: Frontend Updates
1. Update API endpoint configuration
2. Remove any hardcoded port references
3. Test all API calls

### Phase 4: Documentation
1. Update API documentation
2. Update CLAUDE.md with new architecture
3. Update deployment scripts

## Benefits After Consolidation

1. **Single API Surface**: One consistent API for all operations
2. **Simplified Deployment**: Only one API server to manage
3. **Better Performance**: Direct Python access to file system and database
4. **Easier Maintenance**: Single codebase for API logic
5. **Consistent Error Handling**: One error handling pattern
6. **Simplified Configuration**: Single port configuration

## Migration Timeline

- **Week 1**: Implement proxy, test existing functionality
- **Week 2**: Migrate unique endpoints to Flask
- **Week 3**: Remove Node.js API endpoints, update frontend
- **Week 4**: Testing, documentation, deployment updates

## Backwards Compatibility

During migration:
1. Keep both APIs running
2. Use proxy to gradually shift traffic
3. Monitor for any issues
4. Provide fallback mechanism if needed