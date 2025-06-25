# 🚀 Quick Start Guide

Get Media Processor up and running in minutes on any platform!

## 🐧 Linux (Ubuntu/Debian/CentOS/Fedora/Arch)

```bash
# 1. Clone repository
git clone https://github.com/sharvinzlife/Media-Processor.git
cd Media-Processor

# 2. Run setup (installs dependencies + services)
sudo ./bin/setup.sh

# 3. Configure settings
nano lib/config.sh

# 4. Start services
sudo systemctl start media-processor-py.service
sudo systemctl start media-processor-ui.service

# 5. Access web interface
open http://localhost:3005
```

## 🍎 macOS (Intel & Apple Silicon)

```bash
# 1. Clone repository
git clone https://github.com/sharvinzlife/Media-Processor.git
cd Media-Processor

# 2. Run automated setup (installs everything)
./setup-macos.sh

# 3. Configure settings
nano lib/config.sh

# 4. Services start automatically!
# Web interface opens automatically at http://localhost:3005
```

## 🪟 Windows (WSL2 Recommended)

### Option 1: WSL2 (Recommended)
```powershell
# Run in PowerShell as Administrator
./setup-windows.ps1 -UseWSL
```

### Option 2: Native Windows
```powershell
# Run in PowerShell as Administrator
./setup-windows.ps1 -NativeWindows
```

## ⚡ What Gets Installed Automatically

| Component | Purpose | Installation Method |
|-----------|---------|-------------------|
| **Python 3.8+** | Core media processing engine | System package manager |
| **Node.js 18+** | Web interface and API server | System package manager |
| **FFmpeg** | Media file processing and conversion | System package manager |
| **MediaInfo** | Media file analysis and metadata | System package manager |
| **MKVToolNix** | MKV file manipulation and extraction | System package manager |
| **SMB Client** | Network file transfers | System package manager |
| **Python Packages** | Flask, pymediainfo, pysmb, etc. | pip + requirements.txt |
| **Node.js Packages** | Express, cors, axios, etc. | npm + package.json |

### 📦 Dependency Files
- **`requirements.txt`** - All Python dependencies
- **`package.json`** - All Node.js dependencies
- **`dependencies/`** - Platform-specific system packages

## 🎯 Configuration Essentials

Edit `lib/config.sh` with your settings:

```bash
# Download source directory
SOURCE_DIR="/path/to/your/downloads"

# SMB/Network share settings
SMB_SERVER="your-nas-server.local"
SMB_SHARE="your-share-name"
SMB_USER="your-username"
SMB_PASSWORD="your-password"

# Media library paths on your server
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"
```

## 🔧 Service Management

### Linux (systemd)
```bash
# Status
sudo systemctl status media-processor-py.service

# Logs
journalctl -u media-processor-py.service -f

# Restart
sudo systemctl restart media-processor-py.service
```

### macOS (LaunchAgents)
```bash
# Status
launchctl list | grep mediaprocessor

# Logs
tail -f ~/Library/Logs/media-processor-py.log

# Restart
launchctl stop com.mediaprocessor.py
launchctl start com.mediaprocessor.py
```

### Windows (Services)
```powershell
# Status (if using NSSM)
nssm status MediaProcessorPy

# Restart
nssm restart MediaProcessorPy
```

## 🌐 Web Interface Features

Access at **http://localhost:3005**

- 📊 **Dashboard** - Real-time processing statistics
- ⚙️ **Settings** - Configure SMB and media paths
- 📋 **Logs** - View processing logs in real-time
- 🔧 **Diagnostics** - Test connections and troubleshoot
- 📁 **File History** - Track processed media files

## 🆘 Need Help?

- 📖 **Detailed Guide**: [INSTALLATION.md](INSTALLATION.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/sharvinzlife/Media-Processor/issues)
- 📋 **Changes**: [CHANGELOG.md](CHANGELOG.md)
- 🏗️ **Architecture**: [MODULARIZATION.md](MODULARIZATION.md)

---

Made with ❤️ for media enthusiasts