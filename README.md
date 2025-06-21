# 🎬 Media Processor 🎞️ 🍿

<p align="center">
  <img src="https://i.imgur.com/XpotFoB.gif" alt="Media Processor Logo" width="250">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Plex-Ready-E5A00D?style=for-the-badge&logo=plex&logoColor=white" alt="Plex Ready">
  <img src="https://img.shields.io/badge/Jellyfin-Compatible-00A4DC?style=for-the-badge&logo=jellyfin&logoColor=white" alt="Jellyfin Compatible">
  <img src="https://img.shields.io/badge/Emby-Supported-52B54B?style=for-the-badge&logo=emby&logoColor=white" alt="Emby Supported">
  <img src="https://img.shields.io/badge/Kodi-Compatible-17B2E7?style=for-the-badge&logo=kodi&logoColor=white" alt="Kodi Compatible">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JDownloader-Ready-FF6B35?style=for-the-badge&logo=download&logoColor=white" alt="JDownloader Ready">
  <img src="https://img.shields.io/badge/Cross--Platform-Linux%20%7C%20macOS%20%7C%20Windows-blue?style=for-the-badge&logo=windows&logoColor=white" alt="Cross Platform">
  <img src="https://img.shields.io/badge/Language-Malayalam%20Focus-green?style=for-the-badge&logo=language&logoColor=white" alt="Malayalam Focus">
</p>

<h3 align="center">
  🎯 Intelligent Media Processing for Modern Home Servers</br>
  <em>Auto-detects languages • Extracts specific audio/subtitles • Organizes & transfers to NAS</em>
</h3>

> **🚀 Works seamlessly with JDownloader, Plex, Jellyfin, Emby, Kodi, and any download folder**

## 🆕 Latest Updates (v3.3.6)

### 📊 Real-time Dashboard & Database Management System
Complete dashboard overhaul with comprehensive database management:

#### 🎯 Smart Dashboard Features
- **Real-time statistics** - Dashboard updates automatically when media is processed
- **Instant notifications** - Toast notifications for new media files
- **Live polling** - 10-second updates with adaptive frequency based on activity
- **Cache-busting** - Ensures fresh data with no stale statistics
- **Proper time formatting** - Shows accurate relative timestamps (1h ago, 2d ago)

#### 🗄️ Comprehensive Database Management
- **One-click backups** - Create compressed database backups instantly
- **Restore functionality** - Restore from any previous backup with verification
- **Health monitoring** - Real-time database integrity and performance metrics
- **Automatic sync** - Synchronizes data from all sources (JSON files, history)
- **Backup history** - Track all backups with sizes, dates, and checksums

#### ⚡ Enhanced User Experience
- **Frontend database interface** - Full backup/restore controls in web dashboard
- **Visual feedback** - Animated updates and status indicators
- **Error handling** - Robust error reporting and recovery
- **Performance optimization** - Intelligent polling and memory management

### Enhanced Malayalam Processing & SMB Authentication (v3.3.1)
Previous major enhancements to Malayalam content processing and connectivity:

#### 🎬 Malayalam-Only Track Extraction
- **Extract ONLY Malayalam audio + English subtitles** - Removes ALL other tracks (Hindi, Tamil, Telugu, etc.)
- **Significant file size reduction** - Intelligent track removal with optimization reporting
- **Enhanced logging** - Detailed track analysis before and after extraction

#### 🧹 Malayalam Filename Sanitization  
- **Remove redundant language indicators** - Clean up Malayalam, Mal, ML tags from filenames
- **Professional organization** - Clean, standardized filenames after processing
- **Extraction cleanup** - Remove temporary processing suffixes

#### 🔐 Enhanced SMB Authentication
- **NTLMV2 support** - Modern authentication for better compatibility  
- **SMB2/SMB3 enforcement** - Automatic protocol negotiation
- **Domain credentials** - Proper WORKGROUP configuration
- **Enhanced compatibility** - Better smbclient options

#### 🎯 Priority-Based Language Detection
- **Priority 1**: Malayalam → Extract Malayalam audio + English subs only
- **Priority 2**: Hindi/Bollywood → Route to Bollywood folders  
- **Priority 3**: English → Route to English folders
- **Priority 4**: Telugu/Tamil/Kannada → Route to Malayalam folder (fallback)

See [Configuration Documentation](CLAUDE.md) for complete details.

## ✨ Features

* 🔍 **Intelligent Media Detection** - Automatically identifies movies and TV shows
* 🌐 **Robust Language Support** - Special focus on Malayalam content with enhanced language extraction
* 🗂️ **Smart TV Show Organization** - Groups episodes under series folders with proper season detection
* 🧹 **Advanced Pattern Cleaning** - Removes website artifacts from filenames while preserving content
* 🔄 **Automatic Processing** - Monitors download folders and processes new files
* 🖥️ **Modern Web Interface** - Control and monitor through a glassmorphism-styled dashboard
* 👨‍💼 **Admin Panel** - Manage regex patterns and website cleaning rules
* 🔌 **SMB Integration** - Seamlessly transfers files to your media server
* 📊 **Real-time Stats** - Live media library statistics and processing status
* 🛠️ **Pattern Management** - Add, test, and backup custom regex patterns

## 🏗️ Architecture

The Media Processor has been completely refactored into a modular architecture:

```
media-processor/
├── bin/                  # Executable scripts
│   └── media-processor.sh
├── lib/                  # Modular components
│   ├── config.sh         # Configuration variables
│   ├── utils.sh          # Common utility functions
│   ├── media-detection.sh # Media type detection
│   ├── language-extraction.sh # Language processing
│   ├── file-transfer.sh  # SMB file operations
│   └── cleanup.sh        # Cleanup operations
├── web-app/              # Web interface
│   ├── api/              # Backend API server
│   └── build/            # Frontend assets
└── service files         # Systemd service definitions
```

## 🎯 Recent Major Improvements (v2.6.0)

### TV Show Organization Fix
- **Problem**: Episodes were scattered in separate folders instead of being grouped by series
- **Solution**: Enhanced pattern matching and fallback logic for proper series/season organization
- **Result**: Episodes now organized as `Series Name/Season X/Episode.mkv`

### Advanced Pattern Cleaning  
- **Problem**: Website artifacts (www.TamilMV, etc.) cluttering filenames and folder names
- **Solution**: Precise regex patterns that clean website prefixes while preserving content
- **Result**: Clean series names like "Rana Naidu" instead of "www.boo - Rana Naidu"

### Admin Dashboard
- **New Feature**: Pattern management interface for adding custom regex patterns
- **Capabilities**: Test patterns, backup/restore configurations, restart services
- **Benefits**: Easy maintenance and customization without code changes

### Real-time Statistics
- **Enhancement**: Dashboard now shows live stats from the Python API
- **Features**: Auto-updating counters, real-time processing status
- **Performance**: 30-second refresh cycle for current data

## 🚀 Getting Started

### ⚡ Quick Start

**Choose your platform and get running in 5 minutes:**

**[📋 QUICK-START.md](QUICK-START.md)** ← **Start here for fastest setup!**

| Platform | Command |
|----------|---------|
| 🐧 **Linux** | `sudo ./bin/setup.sh` |
| 🍎 **macOS** | `./setup-macos.sh` |
| 🪟 **Windows** | `./setup-windows.ps1` |

### 📖 Comprehensive Installation Guide

For detailed installation instructions across different operating systems, see our comprehensive installation guide:

**[📋 INSTALLATION.md](INSTALLATION.md)**

#### Supported Platforms:
- **🐧 Linux** (Ubuntu, Debian, CentOS, RHEL, Fedora, Arch)
- **🍎 macOS** (Intel & Apple Silicon)  
- **🪟 Windows** (WSL2 + Native)

#### What's Included:
- ✅ Step-by-step installation for each OS
- ✅ Dependency installation guides
- ✅ Service configuration instructions
- ✅ Troubleshooting and common issues
- ✅ Uninstallation procedures

### 🔧 Automated Dependency Installation

**All prerequisites are now installed automatically!** 📦

```bash
# Universal installer (works on Linux/macOS)
./install-dependencies.sh

# Or use platform-specific setup scripts
sudo ./bin/setup.sh      # Linux
./setup-macos.sh         # macOS  
./setup-windows.ps1      # Windows
```

#### Dependencies Managed Automatically:

| Component | Purpose | Auto-Install |
|-----------|---------|--------------|
| **Git** | Version control and repository cloning | ✅ |
| **Node.js 18+** | Web interface and API server | ✅ |
| **Python 3.8+** | Core media processing engine | ✅ |
| **FFmpeg** | Media file processing and conversion | ✅ |
| **MediaInfo** | Media file analysis and metadata | ✅ |
| **MKVToolNix** | MKV file manipulation and extraction | ✅ |
| **SMB Client** | Network file transfers | ✅ |
| **Python Packages** | Flask, requests, pymediainfo, pysmb | ✅ |
| **Node.js Packages** | Express, cors, axios, dotenv | ✅ |

#### Package Files:
- **📄 `requirements.txt`** - Python dependencies
- **📄 `package.json`** - Node.js dependencies  
- **📄 `requirements-system.txt`** - System package reference
- **📁 `dependencies/`** - Platform-specific package lists

## 🖥️ Web Interface

The Media Processor includes a modern web interface for easy control and monitoring:

<p align="center">
  <img src="https://i.imgur.com/dn9gYQn.png" alt="Media Processor Dashboard" width="45%">
  <img src="https://i.imgur.com/J9ETYtO.png" alt="Media Processor Settings" width="45%">
</p>

### Features:
* **📊 Dashboard** - View processing statistics and current status with real-time updates
* **🎛️ Controls** - Start, stop, and restart the processor with visual feedback
* **⚙️ Settings** - Configure SMB connections and media paths with validation
* **📋 Logs** - View real-time processing logs with auto-refresh
* **🔧 Diagnostics** - Test connections and troubleshoot issues
* **📁 Persistent History** - File processing history is saved and persists across system restarts
* **✨ Modern UI** - Glassmorphism design with responsive layout

Access the web interface at: `http://your-server:3005`

### Service Architecture

The Media Processor system consists of two separate services:

1. **`media-processor.service`**: Runs the actual media processing scripts
2. **`media-processor-ui.service`**: Serves the web interface and API on port 3005

> **Note**: To permanently update the systemd service to use port 3005, run:
> ```bash
> sudo ./update-port.sh
> ```
> This script updates the service file and restarts the service with the new port configuration.

Important notes about service management:

* The "Restart" button in the web interface only restarts the `media-processor.service`
* If you make changes to the web interface code, you need to restart the web service separately:
  ```bash
  sudo systemctl restart media-processor-ui.service
  ```
* When troubleshooting, you may need to restart both services:
  ```bash
  sudo systemctl restart media-processor-py.service
  sudo systemctl restart media-processor-ui.service
  ```

### Service Logs

To view service logs for troubleshooting:
```bash
# Media processor logs (primary service)
journalctl -u media-processor-py.service -f

# Web interface logs
journalctl -u media-processor-ui.service -f

# Alternative commands for continuous monitoring
sudo journalctl -f -u media-processor-py.service
sudo journalctl -f -u media-processor-ui.service
```

## 🔧 Configuration

**✨ New Unified Configuration System**: All components now use a single `.env` file for consistent configuration across bash, Python, and Node.js!

Edit `.env` in the project root to customize your setup:

```bash
# Source directory - where JDownloader saves files
SOURCE_DIR="/path/to/your/downloads/"

# Logging configuration
LOG_FILE="/path/to/media-processor.log"
LOG_LEVEL="info"

# SMB connection settings
SMB_SERVER="your-nas-server.local"
SMB_SHARE="your-share-name"
SMB_USERNAME="your-username"
SMB_PASSWORD="your-password"
SMB_DOMAIN=""

# Media paths - relative to SMB share root
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"

# Language extraction settings
EXTRACT_AUDIO_TRACKS=true
EXTRACT_SUBTITLES=true
PREFERRED_LANGUAGE="mal"
PREFERRED_AUDIO_LANGS="mal,eng"
PREFERRED_SUBTITLE_LANGS="eng"

# Processing options
DRY_RUN=false
CLEAN_ORIGINAL_FILES=true
CLEANUP_RAR_FILES=true

# Service ports
PORT=3005
PYTHON_API_PORT=5001
```

### Configuration Benefits:
- **🎯 Single Source of Truth**: All components read from the same `.env` file
- **🔒 Enhanced Security**: Credentials centralized in one secure location
- **🔧 Easy Maintenance**: Update settings in one place, affects all components
- **⚡ Backward Compatible**: Legacy `lib/config.sh` still works as a fallback

📚 **[Full Configuration Documentation](docs/UNIFIED-CONFIGURATION.md)** - Detailed guide on the unified configuration system

## 🌟 Malayalam Language Support

The Media Processor has cutting-edge features for Malayalam content with exclusive track extraction:

* 🎯 **Advanced Detection** - Identifies Malayalam content from filenames, audio tracks, and metadata
* 🔊 **Multi-Format Track Detection** - Supports all Malayalam language code variants (Mal, mal, ML, ml, M, m)
* ✂️ **Exclusive Track Extraction** - Extracts **ONLY** Malayalam audio + English subtitles, **deletes all other tracks**
* 📉 **File Size Optimization** - Significant size reduction through intelligent track removal with detailed reporting
* 🧹 **Filename Sanitization** - Removes redundant Malayalam language indicators for clean organization
* 📝 **Smart Subtitle Handling** - Preserves English subtitles while removing all other subtitle tracks
* 📂 **Dedicated Libraries** - Organizes Malayalam movies and TV shows in separate libraries
* 🔍 **Enhanced Logging** - Detailed track analysis before and after extraction for transparency

## 🔄 Automatic Processing Workflow

The processor monitors your download directory and automatically:

1. 🔍 Detects new media files
2. 🧠 Identifies the content type (movie/TV show) and language
3. 🔤 Extracts appropriate language tracks if needed
4. 📋 Cleans up filenames and adds metadata
5. 📤 Transfers files to the correct location on your media server
6. 🧹 Cleans up leftover files and empty directories

## 🛠️ Advanced Usage

### Manual Processing

You can manually process files or directories:

```bash
./bin/media-processor.sh --process /path/to/file.mkv
```

### Dry Run Mode

Test without making any changes:

```bash
DRY_RUN=true ./bin/media-processor.sh
```

### Debugging

Enable verbose logging:

```bash
DEBUG=true ./bin/media-processor.sh
```

## 🎨 UI/UX Improvements

* ✨ **Glassmorphism Design** - Modern translucent UI with backdrop blur effects
* 🌓 **Enhanced Dark Mode** - Fixed visibility issues with proper contrast and shadows
* 📁 **Clickable File Paths** - Click on file paths to open their location in file manager
* 🎭 **Smooth Animations** - Added typing animation and hover effects throughout
* 📱 **Responsive Design** - Improved mobile and desktop layouts
* 🔧 **Port Configuration** - Changed default port from 3001 to 3005
* 📊 **Real-time Stats** - Dashboard shows live processing statistics
* 🎯 **Improved File Cleaning** - Enhanced regex patterns for removing website prefixes

## 📊 Recent Improvements

* ✅ **Enhanced Language Detection** - Improved detection for all Malayalam language code variants
* ✅ **Reliable Track Extraction** - Redesigned MKV audio track extraction with robust error handling
* ✅ **MediaInfo Integration** - Using MediaInfo for more reliable track identification
* ✅ **Intelligent Track Selection** - Smarter algorithms to find correct Malayalam audio tracks with fallback strategies
* ✅ **Temporary Processing Directory** - Added processed directory structure for safer extraction
* ✅ **Output Verification** - Thorough verification of extracted files before finalization
* ✅ **Comprehensive Logging** - Detailed logging at each step for easier troubleshooting
* ✅ **Subtitle Track Handling** - Improved extraction of subtitles alongside audio tracks
* ✅ **Path Handling Fixes** - Improved handling of file paths with special characters
* ✅ **File Cleanup Logic** - Better management of temporary files and failed extractions
* ✅ **Processing Marker System** - Added a reliable marker system for tracking extraction outputs
* ✅ **Fail-safe Processing** - Enhanced validation steps with proper fallbacks
* ✅ **Modular Architecture** - Complete refactoring into separate, maintainable modules
* ✅ **Modern Web Interface** - Responsive UI with dark mode support
* ✅ **Improved SMB Handling** - More reliable file transfers and error handling
* ✅ **Enhanced Web UI** - Added locked/unlocked states for settings with edit mode
* ✅ **Credential Persistence** - Implemented local storage to prevent settings loss on page refresh
* ✅ **Unified Restart Function** - Restart button now restarts both services with visual feedback
* ✅ **Robust SMB Diagnostics** - Improved SMB diagnostics with detailed error reporting
* ✅ **Input Validation** - Added data cleaning to prevent corruption of configuration values
* ✅ **Service Status Animations** - Enhanced status display with loading animations during state transitions
* ✅ **Advanced Error Handling** - Better error detection and reporting throughout the application
* ✅ **English Content Recognition** - Fixed English language detection to properly categorize content and update statistics
* ✅ **Resolution Detection Improvement** - Enhanced resolution detection to prioritize filename resolution for accurate labeling

## 🔍 Language Extraction Process

The Malayalam language extraction process now follows these steps:

1. 🔎 **Identify Language** - Detects Malayalam content using filename patterns and audio metadata
2. 🎯 **Locate Tracks** - Uses MediaInfo to reliably identify the Malayalam audio track
3. 🗃️ **Extract Tracks** - Employs MKVMerge to extract the Malayalam audio and English subtitles
4. ✓ **Verify Output** - Confirms that the extraction was successful before proceeding
5. 🔄 **Process Output** - Moves the verified file to its temporary location for further processing
6. 🧹 **Cleanup** - Removes any temporary files and directories created during extraction

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

* Thanks to all the open-source tools that make this possible
* Special thanks to the MediaInfo and MKVToolNix projects

## 🐍 Python Migration & Modularization

The media processor has been completely migrated from shell scripts to Python with a fully modular architecture:

### Core Features
- **🏗️ Modular Architecture**: Complete separation of concerns with dedicated modules
- **🔧 Configuration Management**: JSON-based configuration with the `ConfigManager` class
- **📁 File History Management**: Persistent file tracking with the `FileHistoryManager`
- **🎬 Media Detection**: Advanced media type and language detection with `MediaDetector`
- **🌐 API Integration**: Clean dashboard API client with the `DashboardApiClient`
- **📝 Logging Setup**: Centralized logging configuration and management

### Architecture Overview

```
python_core/
├── media_processor.py        # Main processor class
├── api_server.py            # Flask API server
└── modules/                 # Modular components
    ├── config/
    │   └── settings.py      # Configuration management
    ├── utils/
    │   ├── logging_setup.py # Logging utilities
    │   └── file_history.py  # File history management
    ├── api/
    │   └── dashboard_client.py # Dashboard API client
    └── media/
        └── detector.py      # Media detection utilities
```

### Key Improvements
- **📊 Statistics Synchronization**: Python and Node.js systems now share unified file history
- **🔍 Recursive Scanning**: Full recursive directory traversal with `os.walk()` for nested media files
- **🎯 Enhanced Detection**: Improved media type and language detection algorithms
- **🧹 Clean Code Structure**: Eliminated duplicate code and properly separated concerns
- **⚡ Performance**: Optimized processing with better error handling and logging

### Benefits of Modularization
- **🔧 Maintainability**: Each module handles specific functionality
- **🧪 Testability**: Individual modules can be tested independently
- **📈 Scalability**: Easy to add new features without affecting existing code
- **🛠️ Debugging**: Clear separation makes troubleshooting easier
- **🔄 Reusability**: Modules can be reused across different parts of the application

For detailed information about the migration and cleanup:
- [Python Migration](docs/PYTHON-MIGRATION.md) - Migration status and removed legacy components
- [Python Refactoring](docs/PYTHON-REFACTORING.md) - Planned modular architecture for the Python codebase  
- [Changelog](CHANGELOG.md) - Complete history of all changes and improvements
- [Configuration Guide](CLAUDE.md) - Comprehensive system documentation and configuration

---

Made with ❤️ for media enthusiasts
