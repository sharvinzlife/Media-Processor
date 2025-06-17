# 🔧 Unified Configuration System

## Overview

The Media Processor now uses a **single `.env` file** as the source of truth for all configuration across bash scripts, Python modules, and Node.js servers. This eliminates configuration duplication and ensures consistency across all components.

## Architecture

### Configuration Flow
```
.env (root)
    ├── lib/config.sh (bash scripts)
    ├── Python ConfigManager (python_core)
    └── Node.js servers (web-app)
```

## Key Features

### 1. **Single Source of Truth**
- All configuration values are stored in `.env` file at project root
- No more duplicate settings across multiple files
- Changes in one place affect all components

### 2. **Environment Variable Mapping**
- Consistent naming convention across all components
- Automatic type conversion (strings to booleans/integers)
- Support for complex types (comma-separated lists)

### 3. **Backward Compatibility**
- Legacy `lib/config.sh` still works but sources from `.env`
- Optional override files still supported (`.env.local`, `~/.media-processor.env`)
- Fallback values if `.env` is missing

## Configuration File Structure

### `.env` File
Located at project root, contains all configuration:

```bash
# Source directory - where JDownloader saves files
SOURCE_DIR="/home/user/Downloads/"

# SMB Connection Settings
SMB_SERVER="nas.local"
SMB_SHARE="media-share"
SMB_USERNAME="username"
SMB_PASSWORD="password"

# Service Ports
PORT=3005
PYTHON_API_PORT=5001

# Media Paths
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"

# Processing Options
DRY_RUN=false
CLEAN_ORIGINAL_FILES=true
EXTRACT_AUDIO_TRACKS=true
```

### `.env.example` Template
- Provided for new installations
- Contains all variables with example values
- Copy to `.env` and customize

## Component Integration

### Bash Scripts (`lib/config.sh`)
```bash
# Automatically loads .env from project root
source "$PROJECT_ROOT/.env"

# Falls back to hardcoded defaults if .env missing
# Maintains backward compatibility with legacy scripts
```

### Python (`ConfigManager`)
```python
# Uses python-dotenv to load .env
# Maps environment variables to config keys
# Supports type conversion and validation
```

### Node.js (Web Servers)
```javascript
// Uses dotenv package
// Loads .env from appropriate path
// Validates required variables on startup
```

## Migration Guide

### From Old Configuration
1. **Backup existing config**: `cp lib/config.sh lib/config.sh.backup`
2. **Copy `.env.example`**: `cp .env.example .env`
3. **Edit `.env`** with your actual values
4. **Test**: Services will automatically use new config

### Environment Variable Reference

| Variable | Description | Example | Used By |
|----------|-------------|---------|---------|
| `SOURCE_DIR` | Download directory | `/home/user/Downloads/` | All |
| `SMB_SERVER` | Network server | `nas.local` | All |
| `SMB_USERNAME` | SMB username | `mediauser` | All |
| `PORT` | Web UI port | `3005` | Node.js |
| `PYTHON_API_PORT` | API port | `5001` | Python/Node.js |
| `DRY_RUN` | Test mode | `false` | All |

## Security Considerations

### Best Practices
1. **Never commit `.env`** - It's in `.gitignore`
2. **Use `.env.example`** as template
3. **Restrict file permissions**: `chmod 600 .env`
4. **Use environment variables** for production

### Credential Management
```bash
# Set restrictive permissions
chmod 600 .env

# For production, use system environment variables
export SMB_PASSWORD="your-password"
```

## Troubleshooting

### Common Issues

**Issue**: Configuration not loading
```bash
# Check .env exists and is readable
ls -la .env
cat .env | head -5
```

**Issue**: Python not finding config
```bash
# Ensure python-dotenv is installed
pip install python-dotenv
```

**Issue**: Port conflicts
```bash
# Check what's using ports
netstat -tlnp | grep :3005
netstat -tlnp | grep :5001
```

### Debug Mode
Enable verbose logging:
```bash
# In .env
LOG_LEVEL="debug"
VERBOSE_OUTPUT=true
```

## Development Workflow

### Local Development
1. Copy `.env.example` to `.env`
2. Configure for local environment
3. Use `.env.local` for personal overrides

### Testing
```bash
# Test configuration loading
cd lib && source config.sh && echo $SMB_SERVER

# Test Python config
python3 -c "from modules.config.settings import ConfigManager; cm = ConfigManager(); print(cm.get_config())"
```

### Deployment
1. Use `.env.example` as template
2. Set production values
3. Secure credentials with proper permissions

## Benefits

### For Developers
- Single configuration file to maintain
- Consistent variable names across languages
- Easy testing with different configs
- Clear documentation with `.env.example`

### For Users
- Simple installation process
- One file to configure everything
- Clear example values
- No hidden configuration files

### For Operations
- Easy deployment automation
- Environment-specific configs
- Secure credential management
- Consistent across environments

## Future Enhancements

### Planned Features
- Configuration validation on startup
- Web UI configuration editor
- Encrypted credential storage
- Configuration hot-reloading

### Migration Path
- Support for YAML/JSON configs
- Configuration migration tools
- Backward compatibility layers

---

For more information, see:
- [Installation Guide](../INSTALLATION.md)
- [Quick Start](../QUICK-START.md)
- [Changelog](../CHANGELOG.md)