# 📋 Changelog

All notable changes to the Media Processor project will be documented in this file.

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