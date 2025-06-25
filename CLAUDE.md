# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recent Critical Fixes (v3.5.0)

### Top Navigation Redesign & Enhanced Animations
**Major UI/UX Overhaul**: Complete redesign of the navigation system with professional animations and improved user experience.

**Changes Implemented**:

#### **1. Navigation Layout Transformation**
- **Moved from sidebar to top horizontal navbar** for modern design
- **Fixed positioning** with backdrop blur and glassmorphism effects
- **Responsive design** with proper mobile/desktop handling
- **Professional spacing** with increased navbar height (64px → 80px)

#### **2. Enhanced Navigation Components**
```tsx
// Navigation items with emojis and animations
const navigation = [
  { name: 'Dashboard', icon: ChartBarIcon, id: 'dashboard', emoji: '📊' },
  { name: 'File History', icon: DocumentIcon, id: 'files', emoji: '📁' },
  { name: 'Settings', icon: CogIcon, id: 'settings', emoji: '⚙️' },
  { name: 'Database', icon: CircleStackIcon, id: 'database', emoji: '🗄️' },
  { name: 'System', icon: ComputerDesktopIcon, id: 'system', emoji: '🖥️' },
];
```

#### **3. Advanced Animation System**
- **Hover Effects**: Scale (1.1x), lift (-5px), spring physics
- **Emoji Animations**: Rotation (-10° to +10°) and scale (1.2x) on hover
- **Shimmer Effects**: Light sweep across buttons on hover
- **Active States**: Gradient backgrounds with bottom indicators
- **Entry Animations**: Staggered appearance with 0.1s delays

#### **4. Enhanced Feature Pills**
**Interactive Feature Showcase** with multi-layer animations:
- **⚡ Fast Processing** - Lightning icon with rotation effects
- **🎯 Smart Detection** - Target icon with scale animations  
- **📊 Real-time Stats** - Chart icon with pulse effects
- **🔒 Secure Storage** - Lock icon with glow animations

**Animation Layers**:
```tsx
// Background gradient on hover
background: isDark 
  ? "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))"
  : "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))"

// Text glow effect
textShadow: isDark 
  ? "0 0 8px rgba(59, 130, 246, 0.6)" 
  : "0 0 8px rgba(59, 130, 246, 0.4)"
```

#### **5. Typewriter Animation System**
**Restored and Enhanced** rotating slogan system:
- **10 dynamic slogans** with typewriter effect
- **Blinking cursor** animation
- **Smooth transitions** between slogans
- **Emoji integration** in each message

**Slogans Include**:
- "🎬 Your Ultimate Media Hub"
- "🚀 Processing Media with Style" 
- "✨ Streamlining Your Collection"
- "🎯 Smart Media Organization"
- "🔥 Lightning Fast Processing"
- "💎 Crystal Clear Quality"
- "🌟 Premium Media Experience"
- "🎪 Entertainment Central Station"
- "🎭 Where Movies Come Alive"
- "📺 TV Shows Organized Perfectly"

#### **6. Layout Architecture Fixes**
**Critical Fixes**:
- **Header Overflow Resolution**: Fixed content bleeding into navbar area
- **Proper Spacing**: Updated `pt-16` to `pt-20` for taller navbar
- **Component Integration**: Merged AnimatedHeader into Dashboard component
- **Duplicate Content Removal**: Eliminated overlapping titles

#### **7. Improved Spacing & Sizing**
**Professional Layout**:
- **Navigation spacing**: `space-x-1` → `space-x-6` (24px gaps)
- **Button sizing**: `min-w-[70px]` → `min-w-[90px]` with `px-4 py-3` padding
- **Icon sizing**: Emojis `text-base` → `text-xl`, Icons `w-5 h-5` → `w-6 h-6`
- **Logo enhancement**: `w-10 h-10` → `w-12 h-12` with `text-3xl` emoji

#### **8. Theme Integration**
**Comprehensive dark/light mode support**:
- All animations work in both themes
- Dynamic color schemes for backgrounds and effects
- Theme-aware glow and shadow effects
- Seamless theme transition animations

#### **9. Performance Optimizations**
- **Spring physics** for realistic animations
- **Optimized re-renders** with proper useRef usage
- **Efficient animation cleanup** to prevent memory leaks
- **Reduced animation sensitivity** to prevent infinite loops

**Files Modified**:
- `web-app/frontend/src/components/ui/Layout.tsx` - Complete navigation redesign
- `web-app/frontend/src/features/dashboard/Dashboard.tsx` - Integrated animations and typewriter
- `web-app/frontend/src/components/ui/AnimatedHeader.tsx` - Enhanced feature pills
- Multiple build and configuration files updated

## Previous Fixes (v3.4.0)

### Emoji Rendering Fix in React/Tailwind CSS
**Problem**: Emojis (🎬 📺) in the header were invisible but selectable.

**Root Cause**: The `gradient-text` CSS class applied to the h1 element had:
```css
.gradient-text {
  -webkit-text-fill-color: transparent; /* This made ALL text transparent! */
}
```

**Solution**: 
1. Remove `gradient-text` from the h1 element
2. Apply gradient only to the title text within a separate span
3. Reset emoji text fill color explicitly

**Implementation**:
```tsx
<h1> // No gradient-text class
  <span style={{ WebkitTextFillColor: 'initial' }}>🎬</span>
  <span className="gradient-text">Media Library Dashboard</span>
  <span style={{ WebkitTextFillColor: 'initial' }}>📺</span>
</h1>
```

### Light Mode Visibility Fixes
**Problem**: Multiple components had poor contrast in light mode.

**Solution**: Made all components theme-aware using:
```tsx
const { isDark } = useTheme();
// Then conditional styling:
className={cn(
  isDark ? "text-slate-400" : "text-slate-900"
)}
```

## Architecture Overview

This is a **Media Processor** system that automatically organizes and transfers media files with intelligent language detection. The system has been migrated from shell scripts to a modular Python architecture with a Node.js web interface.

### Core Components:
- **Python Core** (`python_core/`): Main processing engine with modular architecture
- **Web Interface** (`web-app/`): React/Node.js dashboard for monitoring and control
- **Shell Libraries** (`lib/`): Legacy bash utilities for backward compatibility
- **Service Management**: Cross-platform service support (systemd/LaunchAgents/Windows Services)

### Key Architecture Patterns:
- **Modular Python Design**: Separated concerns using dedicated modules (config, media detection, API client, file history)
- **Triple Service Architecture**: Separate services for processing (`media-processor-py.service`), web UI (`media-processor-ui.service`), and API server (`media-processor-api.service`)
- **Configuration Management**: Unified `.env` configuration with the `ConfigManager` class using python-dotenv
- **Real-time Dashboard**: Live statistics updates with 10-second polling and instant notifications
- **Database Management System**: SQLite database with comprehensive backup/restore capabilities
- **File History Persistence**: Shared file history between Python and Node.js systems with database sync
- **API Integration**: Flask API server for status updates, database operations, and dashboard communication

## Development Commands

### Python Development:
```bash
# Setup Python environment
cd python_core
./install_dependencies.sh
source .venv/bin/activate

# Run processor
python media_processor.py [file_path]  # Process single file
python media_processor.py             # Monitor mode
python media_processor.py --dry-run   # Test mode

# Run API server
python api_server.py
```

### Web Interface Development:
```bash
# Install dependencies
npm run install-deps

# Development server
npm run dev

# Build production
npm run build

# Start web app
npm run web-app
```

### Service Management:

#### Linux (systemd):
```bash
# Check status
sudo systemctl status media-processor-py.service
sudo systemctl status media-processor-ui.service

# View logs
journalctl -u media-processor-py.service -f
journalctl -u media-processor-ui.service -f

# Alternative log commands for continuous monitoring
sudo journalctl -f -u media-processor-py.service
sudo journalctl -f -u media-processor-ui.service

# Restart services
sudo systemctl restart media-processor-py.service
sudo systemctl restart media-processor-ui.service
```

#### macOS (LaunchAgents):
```bash
# Check status
launchctl list | grep media-processor

# Start/stop services
launchctl load ~/Library/LaunchAgents/com.media-processor.*.plist
launchctl unload ~/Library/LaunchAgents/com.media-processor.*.plist
```

#### Windows (Services):
```powershell
# Check status
Get-Service MediaProcessor*

# Restart services
Restart-Service MediaProcessorPy
Restart-Service MediaProcessorUI
```

### Setup Commands:
```bash
# Linux setup
sudo ./bin/setup.sh

# macOS setup
./setup-macos.sh

# Windows setup
.\setup-windows.ps1

# Universal dependency installation
./install-dependencies.sh
```

## Configuration

### Unified Configuration System (v3.3.0)
**`.env` file is the single source of truth** for all configuration across bash, Python, and Node.js components. This replaced the previous JSON-based configuration system.

**Location**: `/.env` (project root) - see `.env.example` for template

**Key sections**:
- **Source Directory**: Where files are downloaded (typically JDownloader)
- **SMB Settings**: Network share connection details  
- **Media Paths**: Destination paths for different content types
- **Language Settings**: Malayalam/English content organization
- **Processing Options**: Dry run, extraction settings, cleanup behavior
- **Service Ports**: Web UI (3005), Python API (5001), Dashboard API (3001)

### Configuration Loading:
- **Bash**: `lib/config.sh` sources `.env` file with fallback defaults
- **Python**: `ConfigManager` loads `.env` using python-dotenv with automatic environment variable mapping
- **Node.js**: Both web servers use dotenv to load `.env` file

### Migration from Legacy Systems:
- Previous JSON configs are automatically migrated to `.env` format
- Legacy `lib/config.sh` now loads from `.env` maintaining backward compatibility
- Optional overrides: `~/.media-processor.env` and `.env.local` still supported for local customization

## Dependency Management (v3.2.0)

The system features automated dependency installation with zero manual setup required:

### Universal Installer:
```bash
./install-dependencies.sh  # Detects platform and installs all requirements
```

### Dependency Structure:
- **`requirements.txt`**: Python dependencies with platform-specific markers
- **`dependencies/`**: Platform-specific system packages
  - `dependencies/linux.txt`: Linux packages (apt/dnf/pacman)
  - `dependencies/macos.txt`: macOS packages (Homebrew)
  - `dependencies/windows.txt`: Windows packages (Chocolatey)

### Key Dependencies:
- **Python**: `python-dotenv`, `Flask`, `requests`, `smb2` protocol libraries
- **System**: `mkvtoolnix` for media processing, `ffmpeg` for media detection
- **Node.js**: Express, React, dotenv for web interface

## Python Module Structure (v3.0.0)

Complete modular architecture in `python_core/modules/`:
- **`config/settings.py`**: `ConfigManager` class with `.env` integration via python-dotenv
- **`utils/logging_setup.py`**: Centralized logging with rotation and level configuration
- **`utils/file_history.py`**: `FileHistoryManager` for unified history tracking across Python/Node.js
- **`api/dashboard_client.py`**: `DashboardApiClient` for real-time status updates
- **`media/detector.py`**: `MediaDetector` with enhanced pattern recognition and metadata analysis

### Key Improvements:
- Eliminated all code duplication from legacy shell scripts
- Recursive directory scanning using `os.walk()` for better performance
- Shared file history format between all components
- Enhanced error handling and recovery mechanisms

## Media Processing Workflow

1. **Detection**: Identifies media type (movie/TV) and language (Malayalam/English)
2. **Language Extraction**: Uses `mkvmerge` to extract specific audio/subtitle tracks
3. **Organization**: Creates structured paths based on content type and language
4. **Transfer**: Copies files to SMB network share
5. **Cleanup**: Removes temporary files and empty directories
6. **History Tracking**: Records processed files for statistics and avoiding duplicates

### TV Show Organization (v2.6.0)

Enhanced TV show handling with improved pattern recognition:
- **Episode Grouping**: All episodes automatically organized under series folders
- **Pattern Cleaning**: Removes website artifacts and release group tags
- **Season Detection**: Intelligent parsing of S##E## patterns
- **Series Naming**: Consistent folder structure: `Series Name/Season ##/`
- **Special Handling**: Support for multi-episode files and special episodes

## Special Features

### Enhanced Language Detection & Processing:

#### **Malayalam Content (Priority 1)**:
- **Detection**: `malayalam`, `mal`, `ml`, `kerala`, `mollywood` indicators (both in filename and media tracks)
- **Processing**: 
  - Extract **ONLY** Malayalam audio tracks + English subtitle tracks
  - **DELETE ALL OTHER TRACKS** (Hindi, Tamil, Telugu, etc.)
  - Apply Malayalam-specific filename sanitization (removes redundant language indicators)
  - Significant file size reduction through track removal
- **Destination**: Malayalam movies/TV folders
- **Extraction Method**: Uses `mkvmerge` for precise track extraction with enhanced logging

#### **Hindi/Bollywood Content (Priority 2)**:
- **Detection**: `hindi`, `hin`, `hi`, `bollywood`, `multi`, `multilang`, `dual`, `all lang` indicators
- **Processing**: Standard processing without extraction
- **Destination**: Bollywood movies/TV folders (`media/bollywood movies/`, `media/bollywood tv-shows/`)

#### **English Content (Priority 3)**:
- **Detection**: `english`, `eng`, `en`, `hollywood`, `usa`, `uk` indicators
- **Processing**: Standard processing without extraction
- **Destination**: English movies/TV folders

#### **Regional Languages (Priority 4)**:
- **Detection**: `telugu`, `tel`, `tamil`, `tam`, `kannada`, `kan`, `kollywood`, `tollywood`, `sandalwood` indicators
- **Processing**: Standard processing without extraction
- **Destination**: Malayalam movies/TV folders (treated as regional content)

#### **Unknown Languages (Fallback)**:
- **Processing**: Standard processing without extraction
- **Destination**: Malayalam movies/TV folders (default for regional content)

### Web Interface Features:
- Real-time processing statistics via Flask API with 30-second auto-refresh
- SMB connection diagnostics with detailed error reporting
- File processing history with persistent storage and clickable file paths
- Settings management with validation and backup/restore
- Service control (start/stop/restart)
- Glassmorphism UI design with responsive layout

### Admin Dashboard Features:
- **Pattern Management**: Add/edit/delete filename patterns for media detection
- **Regex Testing**: Live regex pattern testing interface
- **Configuration Backup**: Export/import configuration settings
- **System Health**: Real-time service status monitoring
- **Port Migration**: Built-in tools for updating service ports (`update-port.sh`)
- **Statistics Dashboard**: Processing metrics, success rates, and file type distribution

## Testing & Validation

### Dry Run Mode:
Always test changes with dry run mode before processing actual files:
```bash
python media_processor.py --dry-run
```

### Common Validation Commands:
```bash
# Test SMB connection
python -c "from modules.api.dashboard_client import DashboardApiClient; client = DashboardApiClient('http://localhost:5001'); print(client.test_smb_connection())"

# Validate media detection
python -c "from modules.media.detector import MediaDetector; detector = MediaDetector(); print(detector.detect_media_type('sample.mkv'))"

# Test language detection
python -c "from modules.media.detector import MediaDetector; d = MediaDetector(); print(d.detect_language_from_filename('RRR.2022.Hindi.mkv'))"

# Check service ports
./update-port.sh --check

# Migrate to new port
./update-port.sh 3001 3005  # Migrate from old to new port
```

### SMB Connection Troubleshooting:

#### **Test SMB Connectivity**:
```bash
# Test anonymous connection to see available shares
smbclient -L streamwave.local -N

# Test with credentials
smbclient -L streamwave.local -U sharvinzlife%'password'

# Test specific share access
smbclient //streamwave.local/Data-Streamwave -U sharvinzlife%'password'
```

#### **Common SMB Issues & Solutions**:

1. **NT_STATUS_LOGON_FAILURE**:
   - Verify username/password in `.env` file
   - Check SMB_DOMAIN setting (try "WORKGROUP" or leave empty)
   - Ensure user account exists on SMB server

2. **Connection Refused**:
   - Verify SMB_SERVER hostname/IP is correct
   - Check network connectivity: `ping streamwave.local`
   - Ensure SMB ports (445/139) are not blocked

3. **Protocol Version Issues**:
   - Try different SMB protocols in `.env`: `SMB_PROTOCOL_VERSION="SMB2"`
   - Some older servers require SMB1: `SMB_PROTOCOL_VERSION="NT1"`

4. **Authentication Method Issues**:
   - Try different auth methods: `SMB_AUTH_METHOD="ntlmv2"` or `SMB_AUTH_METHOD="user"`
   - Check if server requires domain authentication
   - Verify WORKGROUP vs domain settings

5. **Enhanced Authentication (v3.3.1)**:
   - Added NTLMV2 authentication support
   - SMB2/SMB3 protocol enforcement
   - Domain credentials file with proper formatting
   - Enhanced smbclient options for better compatibility

#### **SMB Configuration Variables**:
```bash
SMB_SERVER="streamwave.local"        # Server hostname/IP
SMB_SHARE="Data-Streamwave"          # Share name
SMB_USERNAME="sharvinzlife"          # Username
SMB_PASSWORD="Y!Y2$dN&itsoAz"        # Password
SMB_DOMAIN="WORKGROUP"               # Domain/Workgroup
SMB_AUTH_METHOD="ntlmv2"             # Authentication method (ntlmv2, user, ntlm)
SMB_PROTOCOL_VERSION="SMB2"          # Protocol version (SMB2, SMB3, NT1)
```

#### **Enhanced SMB Client Options (v3.3.1)**:
```bash
# Automatic protocol negotiation
--option=client min protocol=SMB2
--option=client max protocol=SMB3
--option=client ntlmv2 auth=yes
```

## Recent Architecture Changes

### v3.3.6 - Real-time Dashboard & Database Management System (Latest)
- **Real-time Statistics Updates**: Dashboard automatically refreshes when new media is processed with 10-second polling
- **Comprehensive Database Management**: SQLite database with full backup/restore system and health monitoring
- **Frontend Database Interface**: Web-based backup/restore controls integrated into Settings tab
- **Live Polling System**: Adaptive frequency polling with activity detection and visibility-based optimization
- **Time Formatting Fix**: Proper relative timestamps (1h ago, 2d ago) replaced "Just now" displays throughout interface
- **Visual Feedback**: Toast notifications for new media files, animated updates, and status indicators
- **Database Health Monitoring**: Real-time integrity checks, performance metrics, and automatic recovery
- **Automatic Data Sync**: Synchronizes database from JSON files and history sources with conflict resolution
- **Hourglass Symbol Removal**: Replaced ⏳ symbols with appropriate alternatives (📁, 🔄, ⏸️)

#### Key Files Added:
- `python_core/database_manager.py`: Comprehensive database management with backup/restore/sync
- `python_core/modules/database/media_database.py`: SQLite schema and operations
- `web-app/build/database_manager_ui.js`: Frontend database management interface
- `web-app/build/realtime_updates.js`: Live dashboard updates and notifications
- `web-app/build/time_formatter_fix.js`: Time formatting and symbol cleanup
- `web-app/build/fix_stats_display.js`: Targeted statistics display fixes

#### API Endpoints Added:
- `/api/database/backup` (POST) - Create compressed database backups
- `/api/database/restore` (POST) - Restore from backup with verification
- `/api/database/backups` (GET) - List available backups with metadata
- `/api/database/health` (GET) - Database health and integrity checks
- `/api/database/sync` (POST) - Sync database from all data sources

### v3.3.1 - Enhanced Malayalam Processing & SMB Authentication
- **Malayalam-Only Track Extraction**: Extract only Malayalam audio + English subtitles, delete all other tracks
- **Malayalam Filename Sanitization**: Remove redundant language indicators from processed files
- **Enhanced SMB Authentication**: NTLMV2 support, SMB2/SMB3 protocol enforcement, domain credentials
- **File Size Optimization**: Detailed logging of file size reduction after track extraction
- **Track Analysis**: Enhanced logging of all available audio/subtitle tracks before processing

### v3.3.0 - Unified Configuration System
- Migrated from JSON to `.env` configuration
- Single source of truth for all components
- Automatic migration from legacy configs
- Environment variable mapping for all services

### v3.2.0 - Automated Dependency Management
- Universal installer script with platform detection
- Zero manual installation required
- Platform-specific dependency files
- Python requirements with platform markers

### v3.1.0 - Cross-Platform Support
- Windows support via PowerShell scripts and NSSM
- Enhanced macOS LaunchAgents
- Platform-specific service management
- Universal setup experience

### v3.0.0 - Complete Python Modularization
- Full migration from shell scripts to Python modules
- Unified file history format
- Enhanced error handling and recovery
- Recursive directory scanning with `os.walk()`

## Port Configuration

- **Web Interface**: Port 3005 (configurable in web-app)
- **Python API**: Port 5001 (Flask server)
- **API Proxy**: Uses Express proxy for dashboard communication
- **Migration Tool**: `update-port.sh` for updating service ports