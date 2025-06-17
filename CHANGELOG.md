# 📋 Changelog

All notable changes to the Media Processor project will be documented in this file.

## [v3.3.1] - 2025-06-16 - Enhanced Malayalam Processing & SMB Authentication

### 🎬 Malayalam-Only Track Extraction
- **Exclusive Track Processing**: Extract **ONLY** Malayalam audio + English subtitles, delete all other tracks (Hindi, Tamil, Telugu, etc.)
- **Intelligent Track Analysis**: Enhanced detection using both filename patterns and MediaInfo track analysis
- **File Size Optimization**: Significant file size reduction through intelligent track removal with detailed reporting
- **Quality Preservation**: Maintains all video tracks while optimizing audio/subtitle tracks

### 🧹 Malayalam Filename Sanitization  
- **Redundancy Removal**: Remove redundant Malayalam language indicators (malayalam, mal, ml tags) from processed filenames
- **Extraction Cleanup**: Remove temporary extraction-related suffixes for professional organization
- **Smart Cleaning**: Apply Malayalam-specific cleaning for both movies and TV shows
- **Professional Output**: Generate clean, standardized filenames after processing

### 🔐 Enhanced SMB Authentication
- **NTLMV2 Support**: Added modern NTLMV2 authentication method for better compatibility
- **Protocol Enforcement**: SMB2/SMB3 protocol enforcement with automatic negotiation
- **Domain Configuration**: Proper WORKGROUP domain credentials file formatting
- **Enhanced Options**: Better smbclient compatibility options (`--option=client ntlmv2 auth=yes`)

### 🎯 Priority-Based Language Detection
- **Priority 1**: Malayalam content → Extract Malayalam audio + English subs only, delete all others
- **Priority 2**: Hindi/Bollywood content → Route to Bollywood folders (`media/bollywood movies/`)
- **Priority 3**: English content → Route to English folders
- **Priority 4**: Telugu/Tamil/Kannada → Route to Malayalam folder if no Malayalam language detected

### 🛠️ System Improvements
- **Web Interface Enhancement**: Fixed service control (start/stop functionality) through web interface
- **Configuration Loading**: Enhanced .env file support with python-dotenv integration
- **Virtual Environment**: Fixed virtual environment configuration and dependency management
- **Enhanced Logging**: Detailed track analysis logging before and after extraction

### 🔧 Technical Enhancements
- **Track Extraction Method**: Uses `mkvmerge` for precise track extraction with enhanced error handling
- **File Size Reporting**: Reports original size → extracted size with percentage reduction
- **Extraction Validation**: Thorough verification of extracted files before finalization
- **Enhanced Error Recovery**: Better cleanup of temporary files on extraction failures

### 📊 Processing Features
```bash
# Example Malayalam processing output:
Original file: 2.5GB → Extracted file: 1.2GB (52% reduction)
Kept: 1 Malayalam audio track + 1 English subtitle track
Deleted: 3 Hindi audio tracks + 2 Tamil subtitle tracks + 1 Telugu audio track
```

### 🔄 Configuration Updates
```bash
# Enhanced SMB configuration in .env
SMB_AUTH_METHOD="ntlmv2"              # Modern authentication
SMB_PROTOCOL_VERSION="SMB2"           # Protocol enforcement
SMB_DOMAIN="WORKGROUP"                # Domain configuration

# New Bollywood folder paths
BOLLYWOOD_MOVIE_PATH="media/bollywood movies"
BOLLYWOOD_TV_PATH="media/bollywood tv-shows"
```

### 📝 Documentation Enhancements
- **Updated CLAUDE.md**: Comprehensive documentation of Malayalam extraction process
- **SMB Troubleshooting**: Enhanced SMB authentication troubleshooting guide
- **Processing Workflow**: Detailed explanation of priority-based language detection
- **Version Documentation**: Complete v3.3.1 feature documentation

## [v3.3.0] - 2025-06-16 - Unified Configuration System & .env Integration

### 🔧 Configuration System Overhaul
- **Unified .env Configuration**: Consolidated all configuration into a single `.env` file as the source of truth
- **Multi-Component Support**: Bash scripts, Python modules, and Node.js servers now all read from the same `.env` file
- **Enhanced Python ConfigManager**: Added python-dotenv support with automatic environment variable mapping
- **Improved Node.js Loading**: Both web servers now properly validate and load `.env` file with better error handling
- **Backward Compatible**: Legacy `lib/config.sh` still works but now sources from `.env` with fallback defaults

### 🛠️ Technical Improvements
- **Eliminated Configuration Duplication**: No more maintaining same settings in multiple files
- **Enhanced Security**: Credentials centralized in one secure location instead of scattered across files
- **Better Error Handling**: Proper fallbacks if `.env` file is missing or corrupted
- **Improved Maintainability**: Changes only need to be made in one location

### 📝 Configuration Benefits
```bash
# Single source of truth for all components
SOURCE_DIR="/path/to/downloads/"
SMB_SERVER="your-server.local"
SMB_USERNAME="your-username"
SMB_PASSWORD="your-password"
PORT=3005
PYTHON_API_PORT=5001
```

### 🔄 Migration Path
- **Automatic Migration**: Existing installations continue to work unchanged
- **Optional Override Support**: `~/.media-processor.env` and `.env.local` still supported
- **Enhanced Documentation**: Updated README.md and CLAUDE.md with new configuration approach

## [v3.2.0] - 2025-06-16 - Automated Dependency Management & Requirements Integration

### 📦 Automated Dependency Installation
- **Universal Installer**: Created `install-dependencies.sh` for automatic dependency detection and installation
- **Requirements Files**: Added comprehensive `requirements.txt` for Python dependencies
- **Enhanced package.json**: Updated with all Node.js dependencies and proper metadata
- **Platform Package Lists**: Created organized dependency files for each platform in `dependencies/` folder
- **Zero Manual Installation**: All system packages, Python packages, and Node.js packages installed automatically

### 🔧 Enhanced Setup Integration
```bash
# Single command installs everything
./install-dependencies.sh

# Platform setup scripts now use automated dependency installation
sudo ./bin/setup.sh      # Linux - uses universal installer
./setup-macos.sh         # macOS - uses universal installer
./setup-windows.ps1      # Windows - uses platform-specific packages
```

### 📋 Dependency Management Files

#### Python Dependencies (`requirements.txt`)
- **Core Web Framework**: flask>=3.0.0, flask-cors>=4.0.0
- **Media Processing**: pymediainfo>=6.0.0
- **Network Operations**: pysmb>=1.2.9, requests>=2.31.0
- **Utilities**: tqdm>=4.66.0, psutil>=5.9.0, colorlog>=6.7.0
- **Configuration**: pyyaml>=6.0.0, python-dateutil>=2.8.2
- **File Monitoring**: watchdog>=3.0.0, netifaces>=0.11.0

#### Node.js Dependencies (`package.json`)
- **Core Framework**: express^4.18.2, cors^2.8.5
- **HTTP Client**: axios^1.9.0
- **Utilities**: dotenv^16.5.0, multer^1.4.5
- **Security**: helmet^7.1.0, compression^1.7.4
- **Development**: nodemon^3.0.2 (dev dependency)
- **Engine Requirements**: node>=18.0.0, npm>=9.0.0

#### System Package Lists (`dependencies/`)
- **Linux Packages**: Organized by distribution (Ubuntu/Debian, CentOS/RHEL, Fedora, Arch, openSUSE)
- **macOS Packages**: Homebrew package list with architecture-specific handling
- **Windows Packages**: Chocolatey packages for native Windows and WSL2 environment

### 🚀 Installation Improvements
- **Intelligent Detection**: Automatic OS and distribution detection
- **Package Manager Support**: apt, yum, dnf, pacman, zypper, brew, choco
- **Version Verification**: Ensures minimum versions (Node.js 18+, Python 3.8+)
- **Fallback Support**: Graceful fallback if universal installer unavailable
- **Error Handling**: Comprehensive error reporting with solution suggestions

### 🎯 User Experience Enhancements
- **Single Command Setup**: One script installs all dependencies across platforms
- **Progress Reporting**: Clear status updates during installation process
- **Verification Step**: Post-installation verification of all components
- **Documentation Updates**: Updated README and QUICK-START with automated installation info

### 🔧 Technical Features
- **Virtual Environment**: Automatic Python venv creation and activation
- **Pip Upgrades**: Ensures latest pip version for reliable package installation
- **npm Integration**: Proper Node.js package installation with version checking
- **Cross-Platform Paths**: Platform-aware path handling and executable detection

## [v3.1.0] - 2025-06-16 - Cross-Platform Installation & Enhanced Setup

### 🌍 Cross-Platform Installation Support
- **Comprehensive Installation Guide**: Created detailed [INSTALLATION.md](INSTALLATION.md) with step-by-step instructions
- **Linux Support**: Enhanced setup for Ubuntu, Debian, CentOS, RHEL, Fedora, Arch Linux, and openSUSE
- **macOS Support**: New automated setup script `setup-macos.sh` with Homebrew integration
- **Windows Support**: PowerShell setup script `setup-windows.ps1` with WSL2 and native Windows options
- **Platform Detection**: Setup scripts automatically detect OS and guide users to appropriate installation method

### 🛠️ Enhanced Setup Scripts
- **Intelligent Dependency Detection**: Automatic detection and installation of missing dependencies
- **Package Manager Support**: Support for apt, yum, dnf, pacman, zypper, brew, and choco
- **Version Verification**: Checks for minimum required versions of Node.js (18+) and Python (3.8+)
- **Service Management**: Automated creation of platform-specific services (systemd, LaunchAgents, Windows Services)
- **Error Handling**: Comprehensive error handling with clear user guidance

### 📋 Installation Features
```bash
# Linux (Enhanced)
sudo ./bin/setup.sh

# macOS (New)
./setup-macos.sh

# Windows (New)
./setup-windows.ps1
```

### 🎯 Platform-Specific Improvements

#### Linux Enhancements
- Multi-distribution support with automatic package manager detection
- Enhanced systemd service creation with proper user isolation
- Improved dependency resolution for different Linux flavors
- Better permission handling and security practices

#### macOS Native Support
- Homebrew-based dependency installation for both Intel and Apple Silicon
- LaunchAgents integration for proper macOS service management
- Native file path handling and permission management
- Automatic web interface launching after successful setup

#### Windows Compatibility
- WSL2 integration for optimal Linux-like experience
- Native Windows support with Chocolatey package management
- NSSM-based Windows service creation
- PowerShell-based automated setup with error handling

### 📖 Documentation Improvements
- **Installation Matrix**: Clear comparison table of dependencies across platforms
- **Prerequisites Summary**: Quick reference for all required components
- **Troubleshooting Guide**: Common issues and solutions for each platform
- **Uninstallation Procedures**: Clean removal instructions for all platforms

### 🔧 Technical Enhancements
- **Virtual Environment Management**: Automated Python venv setup across all platforms
- **Node.js Integration**: Proper npm dependency management with error handling
- **Path Resolution**: Platform-aware path handling and executable detection
- **Service Verification**: Post-installation service status verification

### 🎨 User Experience
- **Colored Output**: Clear status messages with color-coded feedback
- **Progress Indicators**: Step-by-step progress reporting during installation
- **Platform Guidance**: Automatic detection and guidance to correct setup method
- **Web Interface Testing**: Automatic verification and launching of web interface

## [v3.0.0] - 2025-06-16 - Complete Python Modularization & Code Cleanup

### 🏗️ Major Architecture Overhaul
- **Complete Modularization**: Refactored entire Python codebase into clean, separated modules
- **Eliminated Code Duplication**: Removed duplicate `DashboardApiClient` class and redundant methods
- **Centralized Configuration**: Created `ConfigManager` class for unified configuration handling
- **Dedicated Utilities**: Separated logging and file history management into dedicated modules
- **Media Detection Module**: Extracted media type and language detection into `MediaDetector` class

### 🎯 Core Module Structure
```
python_core/modules/
├── config/settings.py       # Configuration management
├── utils/
│   ├── logging_setup.py     # Centralized logging setup
│   └── file_history.py      # File history management
├── api/dashboard_client.py  # Dashboard API integration
└── media/detector.py        # Media type & language detection
```

### 📊 Enhanced Statistics & Data Sync
- **Unified File History**: Python and Node.js systems now share synchronized file statistics
- **Accurate Counting**: Fixed dashboard showing incorrect Malayalam TV show counts (8 → 18)
- **Duplicate Prevention**: Enhanced logic to count only unique successful files
- **Real-time Sync**: Automatic statistics synchronization after each processing operation

### 🔍 Recursive Directory Processing
- **Full Depth Scanning**: Upgraded from 2-level depth scanning to complete recursive traversal
- **Nested File Support**: Media files in subfolders are now automatically detected and processed
- **Comprehensive Coverage**: Uses `os.walk()` for complete directory tree traversal
- **Performance Optimized**: Efficient scanning with proper depth logging

### 🎨 UI/UX Improvements
- **Dark Mode Typography**: Fixed persistent dark mode typing text visibility issues
- **Animated Golden Shine**: Implemented smooth left-to-right golden shine animation effect
- **Emoji Visibility**: Enhanced emoji display in both light and dark modes
- **Header Redesign**: Complete header rewrite eliminating resizing and animation conflicts
- **Glassmorphism Enhancements**: Improved translucent UI elements with proper contrast

### 🧹 Code Quality & Cleanup
- **Removed Legacy Files**: Cleaned up backup files, test scripts, and unused components
- **Consolidated Documentation**: Organized all documentation files and guides
- **Import Optimization**: Streamlined imports and dependencies across all modules
- **Method Elimination**: Removed duplicate `_load_config` and `_setup_logging` methods
- **Syntax Validation**: All modular files pass compilation and import tests

### 🔧 Technical Improvements
- **Enhanced Error Handling**: Better exception handling throughout the modular architecture
- **Improved Logging**: Centralized logging configuration with proper level management
- **Configuration Validation**: Robust configuration loading with fallback defaults
- **Module Dependencies**: Clear dependency management between modules
- **Type Safety**: Improved type hints and validation across the codebase

### 🚀 Performance & Reliability
- **Memory Optimization**: Reduced memory footprint through better code organization
- **Processing Efficiency**: Streamlined media processing pipeline with modular components
- **Error Recovery**: Enhanced fault tolerance and graceful error handling
- **Resource Management**: Better cleanup and resource management throughout the application

### 📝 Developer Experience
- **Clear Separation**: Each module has a single, well-defined responsibility
- **Easy Testing**: Individual modules can be tested independently
- **Better Debugging**: Clear module boundaries make troubleshooting easier
- **Future-Proof**: Modular structure allows easy addition of new features
- **Documentation**: Comprehensive inline documentation for all modules

### 🔄 Migration & Compatibility
- **Backward Compatible**: All existing functionality preserved during modularization
- **Service Integration**: Seamless integration with existing systemd services
- **Configuration Preservation**: All existing configuration options maintained
- **API Compatibility**: Dashboard API endpoints remain unchanged

## [v2.6.0] - 2025-06-16 - TV Show Organization & Advanced Pattern Cleaning

### 🎯 Major TV Show Organization Fix
- **Fixed Episode Grouping**: TV show episodes now properly grouped under single series folders instead of separate folders per episode
- **Season Detection**: Correctly detects and creates season folders (S01 → Season 1, S02 → Season 2, etc.)
- **Clean Series Names**: Removes website artifacts from series folder names ("www.boo - Rana Naidu" → "Rana Naidu")
- **Clean Filenames**: Removes website prefixes from final filenames while preserving episode information

### 🧹 Enhanced Pattern Cleaning
- **Precise Regex Patterns**: Replaced aggressive regex patterns with precise website-specific patterns
- **TamilMV Improvements**: Better handling of various TamilMV formats (www.1TamilMV.boo, www.2TamilMV.org, etc.)
- **Fallback Logic**: Enhanced S##E## pattern extraction for better series name detection
- **Multi-layer Cleaning**: Applies cleaning at multiple stages to ensure clean output

### 🔧 Algorithm Improvements
- **Season Number Extraction**: Extracts actual season numbers from S##E## patterns
- **Episode Title Preservation**: Maintains episode titles while cleaning website artifacts
- **Smart Fallback**: Improved fallback logic when primary pattern matching fails
- **Series Name Intelligence**: Better extraction of clean series names from complex filenames

### 📁 File Organization Examples
**Before Fix:**
```
media/malayalam-tv-shows/
├── www.boo - Rana Naidu S02E04 Bloody Amateur/
├── www.boo - Rana Naidu S02E05 Another Episode/
└── www.boo - Rana Naidu S02E06 Yet Another/
```

**After Fix:**
```
media/malayalam-tv-shows/
└── Rana Naidu/
    └── Season 2/
        ├── Rana Naidu S02E04 Bloody Amateur.Malayalam.mkv
        ├── Rana Naidu S02E05 Another Episode.Malayalam.mkv
        └── Rana Naidu S02E06 Yet Another.Malayalam.mkv
```

### 🐛 Technical Fixes
- **Regex Pattern Optimization**: Fixed overly broad patterns that were removing too much content
- **Variable Scope Issues**: Fixed season/episode detection in fallback logic
- **Filename Preservation**: Maintains episode information while cleaning website artifacts
- **Path Construction**: Improved target path construction for proper folder hierarchy

### 📝 Documentation
- **Comprehensive Fix Documentation**: Added detailed TV-SHOW-ORGANIZATION-FIX.md
- **Pattern Templates**: Provided templates for adding new website patterns in the future
- **Debugging Guide**: Added logging indicators for troubleshooting organization issues

## [v2.5.0] - 2025-06-16 - Modern UI Overhaul & Port Migration

### 🎨 UI/UX Enhancements
- **Glassmorphism Design System**: Implemented modern translucent UI with backdrop blur effects
- **Enhanced Dark Mode**: Fixed white-on-white text visibility issues with proper contrast
- **Responsive Header**: Added compact sticky header with smooth animations
- **Interactive File Paths**: Made file paths clickable to open locations in system file manager
- **Typing Animation**: Added smooth typewriter effect to header tagline
- **Improved Footer**: Fixed spacing issues and proper layout alignment
- **Table Improvements**: Applied glassmorphism styling to table headers for better visibility

### 🔧 Technical Improvements
- **Port Migration**: Changed default web interface port from 3001 to 3005
- **Server Cleanup**: Removed duplicate app.listen() calls that caused port conflicts
- **Error Handling**: Added comprehensive error handling for API endpoints
- **Toast Notifications**: Implemented user feedback system for actions

### 🐛 Bug Fixes
- **Fixed Dashboard Stats**: Resolved dark mode visibility issues in statistics display
- **Fixed Logs Loading**: Corrected element ID mismatch preventing log display
- **Fixed File Path Display**: Made long file paths scrollable and fully visible
- **Fixed Header Cut-off**: Resolved header visibility issues when scrolling
- **Fixed Table Headers**: Ensured table headers are visible in both light and dark modes

### 🧹 File Processing Improvements
- **Enhanced Regex Patterns**: Updated website prefix removal patterns for better filename cleaning
- **TamilMV Pattern Detection**: Improved detection of dynamic TamilMV website patterns
- **TV Series Organization**: Enhanced folder structure for TV episodes
- **Real-time Processing**: Dashboard now shows live processing status and statistics

### 🚀 Performance Optimizations
- **Reduced Server Load**: Eliminated duplicate server instances
- **Improved API Responses**: Enhanced error handling and response formatting
- **Better Resource Management**: Optimized memory usage and cleanup

### 🔄 Infrastructure Changes
- **Service Port Update**: Created update-port.sh script for easy port migration
- **Systemd Configuration**: Updated service files to use new port
- **Environment Variables**: Enhanced configuration management

### 📱 Mobile & Accessibility
- **Responsive Design**: Improved mobile layout and touch interactions
- **Better Contrast**: Enhanced color schemes for better readability
- **Hover States**: Added visual feedback for interactive elements

### 🗂️ File Organization
- **Smart Folder Creation**: Improved TV series folder structure
- **Path Handling**: Better handling of special characters in file paths
- **Cleanup Logic**: Enhanced temporary file management

## [v2.4.0] - Previous Releases

### Major Features
- Python migration from shell scripts
- Flask API server implementation
- SMB integration improvements
- Enhanced Malayalam language support
- Web interface introduction

---

### Migration Notes

#### Port Change (3001 → 3005)
To update existing installations to use the new port:

```bash
# Run the port update script
sudo ./update-port.sh

# Or manually update the service
sudo sed -i 's/Environment=PORT=3001/Environment=PORT=3005/' /etc/systemd/system/media-processor-ui.service
sudo systemctl daemon-reload
sudo systemctl restart media-processor-ui.service
```

#### UI Improvements
The new glassmorphism design provides:
- Better visual hierarchy
- Improved accessibility
- Modern aesthetic
- Enhanced user experience

#### File Processing
Enhanced filename cleaning now handles:
- Dynamic TamilMV website patterns
- Multiple website prefix formats
- Better TV series organization
- Improved special character handling

---

Made with ❤️ for media enthusiasts