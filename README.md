# 🎬 Media Processor 🎞️ 🍿

<p align="center">
  <img src="https://i.imgur.com/XpotFoB.gif" alt="Media Processor Logo" width="250">
</p>

<h3 align="center">
  Automatically organizes your media files into structured libraries</br>
  <em>and moves them to appropriate locations</em>
</h3>

> **Automatically organize your media files with intelligent language detection and extraction**

## ✨ Features

* 🔍 **Intelligent Media Detection** - Automatically identifies movies and TV shows
* 🌐 **Robust Language Support** - Special focus on Malayalam content with enhanced language extraction
* 🗂️ **Smart Organization** - Creates proper folder structures for your media library
* 🔄 **Automatic Processing** - Monitors download folders and processes new files
* 🖥️ **Web Interface** - Control and monitor the processor through a sleek web UI
* 🔌 **SMB Integration** - Seamlessly transfers files to your media server
* 🧹 **Cleanup Tools** - Removes leftover files and empty directories

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

## 🚀 Getting Started

### Prerequisites

* Linux system with Bash
* `smbclient` for SMB file transfers
* `mediainfo` for media analysis
* `ffmpeg` for media processing
* `mkvmerge` and `mkvextract` for MKV manipulation

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sharvinzlife/Media-Processor.git
   cd Media-Processor
   ```

2. Configure your settings:
   ```bash
   nano lib/config.sh
   ```

3. Install the service:
   ```bash
   sudo ./setup.sh
   ```

4. Start the service:
   ```bash
   sudo systemctl start media-processor.service
   ```

## 🖥️ Web Interface

The Media Processor includes a modern web interface for easy control and monitoring:

* **Dashboard** - View processing statistics and current status
* **Controls** - Start, stop, and restart the processor
* **Settings** - Configure SMB connections and media paths
* **Logs** - View real-time processing logs
* **Diagnostics** - Test connections and troubleshoot issues
* **Persistent History** - File processing history is saved and persists across system restarts

Access the web interface at: `http://your-server:3001`

### Service Architecture

The Media Processor system consists of two separate services:

1. **`media-processor.service`**: Runs the actual media processing scripts
2. **`media-processor-web.service`**: Serves the web interface and API on port 3001

Important notes about service management:

* The "Restart" button in the web interface only restarts the `media-processor.service`
* If you make changes to the web interface code, you need to restart the web service separately:
  ```bash
  sudo systemctl restart media-processor-web.service
  ```
* When troubleshooting, you may need to restart both services:
  ```bash
  sudo systemctl restart media-processor.service
  sudo systemctl restart media-processor-web.service
  ```

### Service Logs

To view service logs for troubleshooting:
```bash
# Media processor logs
journalctl -u media-processor.service -f

# Web interface logs
journalctl -u media-processor-web.service -f
```

## 🔧 Configuration

Edit `lib/config.sh` to customize your setup:

```bash
# Base directories
SOURCE_DIR=/path/to/downloads/
LOG_FILE="/path/to/media-processor.log"

# SMB connection settings
SMB_SERVER="your-server"
SMB_SHARE="your-share"
SMB_USER="username"
SMB_PASSWORD="password"

# Media paths
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"

# Language extraction settings
EXTRACT_AUDIO_TRACKS=true
EXTRACT_SUBTITLES=true
PREFERRED_LANGUAGE="mal"
```

## 🌟 Malayalam Language Support

The Media Processor has enhanced features for Malayalam content:

* 🎯 **Advanced Detection** - Identifies Malayalam content from filenames, audio tracks, and metadata
* 🔊 **Multi-Format Track Detection** - Supports all Malayalam language code variants (Mal, mal, ML, ml, M, m)
* 🔍 **Intelligent Track Selection** - Automatically finds the correct Malayalam audio track
* 📝 **Subtitle Preservation** - Keeps English subtitles while extracting Malayalam audio
* 📂 **Dedicated Libraries** - Organizes Malayalam movies and TV shows in separate libraries

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

---

Made with ❤️ for media enthusiasts
