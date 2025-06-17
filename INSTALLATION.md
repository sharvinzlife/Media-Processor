# 🚀 Installation Guide

This guide provides step-by-step installation instructions for Media Processor on different operating systems.

## 📋 Prerequisites

Before installing, ensure you have the following installed on your system:

### Core Dependencies
- **Git** - For cloning the repository
- **Node.js 18+** - For the web interface
- **Python 3.8+** - For core processing
- **FFmpeg** - For media processing
- **MediaInfo** - For media analysis

### Platform-Specific Tools
- **Linux**: `smbclient`, `mkvtoolnix`
- **macOS**: `smbclient` (via Homebrew), `mkvtoolnix`
- **Windows**: SMB client (built-in), `mkvtoolnix`

---

## 🐧 Linux Installation

### Ubuntu/Debian

#### 1. Install System Dependencies
```bash
# Update package list
sudo apt update

# Install core dependencies
sudo apt install -y git nodejs npm python3 python3-pip python3-venv \
    ffmpeg mediainfo smbclient mkvtoolnix

# Verify installations
node --version    # Should be 18+
python3 --version # Should be 3.8+
ffmpeg -version
mediainfo --version
```

#### 2. Clone and Setup Repository
```bash
# Clone the repository
git clone https://github.com/sharvinzlife/Media-Processor.git
cd Media-Processor

# Make scripts executable
chmod +x bin/*.sh
chmod +x python_core/*.sh
chmod +x *.sh
```

#### 3. Configure Settings
```bash
# Edit configuration file
nano lib/config.sh

# Configure the following variables:
# SOURCE_DIR="/path/to/your/downloads"
# SMB_SERVER="your-nas-server"
# SMB_SHARE="your-share-name"
# SMB_USER="your-username"
# SMB_PASSWORD="your-password"
```

#### 4. Install and Start Services
```bash
# Run the setup script (creates systemd services)
sudo ./bin/setup.sh

# Start the media processor service
sudo systemctl start media-processor-py.service

# Start the web interface service
sudo systemctl start media-processor-ui.service

# Enable auto-start on boot
sudo systemctl enable media-processor-py.service
sudo systemctl enable media-processor-ui.service
```

#### 5. Verify Installation
```bash
# Check service status
sudo systemctl status media-processor-py.service
sudo systemctl status media-processor-ui.service

# View logs
journalctl -u media-processor-py.service -f

# Access web interface
# Open browser to: http://localhost:3005
```

### CentOS/RHEL/Fedora

#### 1. Install System Dependencies
```bash
# For CentOS/RHEL (enable EPEL first)
sudo yum install -y epel-release
sudo yum install -y git nodejs npm python3 python3-pip \
    ffmpeg mediainfo samba-client mkvtoolnix

# For Fedora
sudo dnf install -y git nodejs npm python3 python3-pip \
    ffmpeg mediainfo samba-client mkvtoolnix
```

#### 2-5. Follow same steps as Ubuntu/Debian above

### Arch Linux

#### 1. Install System Dependencies
```bash
# Install dependencies
sudo pacman -S git nodejs npm python python-pip \
    ffmpeg mediainfo smbclient mkvtoolnix-cli

# Install AUR packages if needed
yay -S python-virtualenv
```

#### 2-5. Follow same steps as Ubuntu/Debian above

---

## 🍎 macOS Installation

### Using Homebrew (Recommended)

#### 1. Install Homebrew
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Install Dependencies
```bash
# Install core dependencies
brew install git node python ffmpeg mediainfo mkvtoolnix

# Install SMB client
brew install samba

# Verify installations
node --version    # Should be 18+
python3 --version # Should be 3.8+
ffmpeg -version
mediainfo --version
```

#### 3. Clone and Setup Repository
```bash
# Clone the repository
git clone https://github.com/sharvinzlife/Media-Processor.git
cd Media-Processor

# Make scripts executable
chmod +x bin/*.sh
chmod +x python_core/*.sh
chmod +x *.sh
```

#### 4. Configure Settings
```bash
# Edit configuration file
nano lib/config.sh

# Configure paths (macOS specific):
# SOURCE_DIR="/Users/$(whoami)/Downloads"  # Or your preferred download folder
# SMB_SERVER="your-nas-server"
# SMB_SHARE="your-share-name"
# SMB_USER="your-username"
# SMB_PASSWORD="your-password"
```

#### 5. Install Python Dependencies
```bash
# Navigate to Python core directory
cd python_core

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
./install_dependencies.sh

# Return to main directory
cd ..
```

#### 6. Setup Services (Using LaunchAgents)
```bash
# Create LaunchAgents directory if it doesn't exist
mkdir -p ~/Library/LaunchAgents

# Create service files for macOS
sudo ./bin/setup.sh

# Load and start services
launchctl load ~/Library/LaunchAgents/com.mediaprocessor.py.plist
launchctl load ~/Library/LaunchAgents/com.mediaprocessor.ui.plist

# Start services
launchctl start com.mediaprocessor.py
launchctl start com.mediaprocessor.ui
```

#### 7. Verify Installation
```bash
# Check if services are running
launchctl list | grep mediaprocessor

# Check logs
tail -f ~/Library/Logs/media-processor-py.log

# Access web interface
# Open browser to: http://localhost:3005
```

### Alternative: Manual Run (Development)
```bash
# Terminal 1: Start Python processor
cd python_core
source venv/bin/activate
python3 media_processor.py

# Terminal 2: Start web interface
cd web-app
npm install
npm start
```

---

## 🪟 Windows Installation

### Using Windows Subsystem for Linux (WSL) - Recommended

#### 1. Install WSL2
```powershell
# Run in PowerShell as Administrator
wsl --install -d Ubuntu

# Restart computer and complete Ubuntu setup
```

#### 2. Follow Linux Installation Steps
Once WSL is set up, follow the Ubuntu/Debian installation steps above within the WSL environment.

#### 3. Access from Windows
- Web interface will be available at `http://localhost:3005`
- Configure Windows file paths in `lib/config.sh` using WSL paths:
  ```bash
  SOURCE_DIR="/mnt/c/Users/$(whoami)/Downloads"
  ```

### Native Windows Installation (Advanced)

#### 1. Install Dependencies

**Install Chocolatey (Package Manager)**
```powershell
# Run in PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

**Install Core Dependencies**
```powershell
# Install dependencies via Chocolatey
choco install -y git nodejs python ffmpeg mediainfo-cli

# Install MKVToolNix
choco install -y mkvtoolnix
```

#### 2. Clone Repository
```powershell
# Clone the repository
git clone https://github.com/sharvinzlife/Media-Processor.git
cd Media-Processor
```

#### 3. Setup Python Environment
```powershell
# Navigate to Python directory
cd python_core

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 4. Configure Settings
```powershell
# Edit configuration (use Windows paths)
notepad lib/config.sh

# Example Windows configuration:
# SOURCE_DIR="/mnt/c/Users/YourUsername/Downloads"
# Or use PowerShell to convert paths
```

#### 5. Install Node.js Dependencies
```powershell
# Install web interface dependencies
cd web-app
npm install
cd ..
```

#### 6. Create Windows Services (Optional)
```powershell
# Use NSSM (Non-Sucking Service Manager) to create Windows services
choco install -y nssm

# Create Python service
nssm install MediaProcessorPy "C:\path\to\python.exe" "C:\path\to\Media-Processor\python_core\media_processor.py"
nssm set MediaProcessorPy Start SERVICE_AUTO_START

# Create Web UI service
nssm install MediaProcessorUI "C:\Program Files\nodejs\node.exe" "C:\path\to\Media-Processor\web-app\server.js"
nssm set MediaProcessorUI Start SERVICE_AUTO_START

# Start services
nssm start MediaProcessorPy
nssm start MediaProcessorUI
```

#### 7. Manual Run (Development)
```powershell
# Terminal 1: Start Python processor
cd python_core
venv\Scripts\activate
python media_processor.py

# Terminal 2: Start web interface
cd web-app
npm start
```

---

## 🔧 Post-Installation Configuration

### 1. Web Interface Access
- Open your browser and navigate to `http://localhost:3005`
- The dashboard should load showing the media processor interface

### 2. SMB Connection Testing
```bash
# Test SMB connection (Linux/macOS)
smbclient -L \\\\your-server -U your-username

# Test from web interface
# Use the Diagnostics page to test SMB connectivity
```

### 3. Directory Permissions
```bash
# Ensure proper permissions for download directory
chmod 755 /path/to/download/directory

# For SMB shares, ensure write permissions
```

### 4. Firewall Configuration
```bash
# Linux: Allow port 3005
sudo ufw allow 3005

# macOS: Add firewall rule if needed
# Windows: Allow through Windows Firewall
```

---

## 🧹 Uninstallation

### Linux
```bash
# Stop and disable services
sudo systemctl stop media-processor-py.service media-processor-ui.service
sudo systemctl disable media-processor-py.service media-processor-ui.service

# Remove service files
sudo rm /etc/systemd/system/media-processor-*.service
sudo systemctl daemon-reload

# Remove application directory
rm -rf ~/Media-Processor
```

### macOS
```bash
# Stop and unload services
launchctl stop com.mediaprocessor.py
launchctl stop com.mediaprocessor.ui
launchctl unload ~/Library/LaunchAgents/com.mediaprocessor.*.plist

# Remove service files
rm ~/Library/LaunchAgents/com.mediaprocessor.*.plist

# Remove application directory
rm -rf ~/Media-Processor
```

### Windows
```powershell
# Stop and remove services (if using NSSM)
nssm stop MediaProcessorPy
nssm stop MediaProcessorUI
nssm remove MediaProcessorPy confirm
nssm remove MediaProcessorUI confirm

# Remove application directory
Remove-Item -Recurse -Force "C:\path\to\Media-Processor"
```

---

## 🆘 Troubleshooting

### Common Issues

#### Permission Denied Errors
```bash
# Fix script permissions
chmod +x bin/*.sh python_core/*.sh *.sh

# Fix directory permissions
sudo chown -R $USER:$USER /path/to/Media-Processor
```

#### Port Already in Use
```bash
# Find process using port 3005
sudo lsof -i :3005  # Linux/macOS
netstat -ano | findstr :3005  # Windows

# Kill the process or change port in configuration
```

#### SMB Connection Issues
```bash
# Test SMB connectivity
smbclient -L \\\\server -U username

# Check network connectivity
ping your-server

# Verify credentials in configuration
```

#### Python Module Not Found
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Getting Help

1. **Check Logs**: 
   - Linux: `journalctl -u media-processor-py.service -f`
   - macOS: `tail -f ~/Library/Logs/media-processor-py.log`
   - Windows: Check Event Viewer or service logs

2. **Web Interface Diagnostics**: 
   - Access `http://localhost:3005` and use the Diagnostics page

3. **GitHub Issues**: 
   - Report issues at: https://github.com/sharvinzlife/Media-Processor/issues

---

Made with ❤️ for media enthusiasts across all platforms