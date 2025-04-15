# 🎬 Media Processor

![Media Processor Logo](https://img.shields.io/badge/Media%20Processor-v2.0-blue?style=for-the-badge&logo=appveyor)

> **Automatically organize your media files into structured libraries with intelligent language detection and extraction**

## ✨ Features

- 🔍 **Intelligent Media Detection** - Automatically identifies movies and TV shows
- 🌐 **Language Support** - Special focus on Malayalam content with dedicated language extraction
- 🗂️ **Smart Organization** - Creates proper folder structures for your media library
- 🔄 **Automatic Processing** - Monitors download folders and processes new files
- 🖥️ **Web Interface** - Control and monitor the processor through a sleek web UI
- 🔌 **SMB Integration** - Seamlessly transfers files to your media server
- 🧹 **Cleanup Tools** - Removes leftover files and empty directories

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

- Linux system with Bash
- `smbclient` for SMB file transfers
- `mediainfo` for media analysis
- `ffmpeg` for media processing
- `mkvmerge` and `mkvextract` for MKV manipulation

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

4. Start the services:
   ```bash
   sudo systemctl start media-processor.service
   sudo systemctl start media-processor-web.service
   ```

## 🖥️ Web Interface

The Media Processor includes a modern web interface for easy control and monitoring:

- **Dashboard** - View processing statistics and current status
- **Controls** - Start, stop, and restart the processor
- **Settings** - Configure SMB connections and media paths
- **Logs** - View real-time processing logs
- **Diagnostics** - Test connections and troubleshoot issues

Access the web interface at: `http://your-server:3001`

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

The Media Processor has special features for Malayalam content:

- 🎯 **Intelligent Detection** - Identifies Malayalam content from filenames and metadata
- 🔊 **Audio Track Extraction** - Extracts Malayalam audio tracks from multi-language files
- 📝 **Subtitle Management** - Preserves English subtitles for Malayalam content
- 📂 **Dedicated Libraries** - Organizes Malayalam movies and TV shows in separate libraries

## 🔄 Automatic Processing

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

- ✅ **Modular Architecture** - Complete refactoring into separate modules
- ✅ **Enhanced Malayalam Support** - Improved language detection and extraction
- ✅ **Modern Web Interface** - New responsive UI with dark mode support
- ✅ **Improved SMB Handling** - More reliable file transfers and error handling
- ✅ **Better Filename Cleaning** - Removes language tags and cleans up filenames
- ✅ **Diagnostic Tools** - New tools for troubleshooting connection issues

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Thanks to all the open-source tools that make this possible
- Special thanks to the MediaInfo and MKVToolNix projects

---

<p align="center">
  Made with ❤️ for media enthusiasts
</p>