#!/bin/bash

# Media Processor - macOS Setup Script
# This script sets up Media Processor on macOS using Homebrew

set -e  # Exit on any error

echo "🍎 Media Processor - macOS Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only!"
    exit 1
fi

print_status "Starting Media Processor setup for macOS..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    print_success "Homebrew found!"
fi

# Update Homebrew
print_status "Updating Homebrew..."
brew update

# Check if universal dependency installer exists
if [ -f "./install-dependencies.sh" ]; then
    print_status "Running universal dependency installer..."
    ./install-dependencies.sh
else
    print_warning "Universal installer not found, using fallback method..."
    
    # Install dependencies
    print_status "Installing dependencies..."

    dependencies=(
        "git"
        "node"
        "python@3.11"
        "ffmpeg"
        "mediainfo"
        "mkvtoolnix"
        "samba"
    )

    for dep in "${dependencies[@]}"; do
        if brew list "$dep" &>/dev/null; then
            print_success "$dep is already installed"
        else
            print_status "Installing $dep..."
            brew install "$dep"
        fi
    done
fi

# Ensure Python 3 is available as python3
if ! command -v python3 &> /dev/null; then
    print_status "Creating python3 symlink..."
    brew link --overwrite python@3.11
fi

# Verify installations
print_status "Verifying installations..."

check_command() {
    if command -v "$1" &> /dev/null; then
        version=$($1 --version 2>&1 | head -n1)
        print_success "$1 is installed: $version"
        return 0
    else
        print_error "$1 is not available"
        return 1
    fi
}

check_command "git"
check_command "node"
check_command "python3"
check_command "ffmpeg"
check_command "mediainfo"

# Check MKV tools
if command -v mkvmerge &> /dev/null; then
    print_success "mkvtoolnix is installed"
else
    print_error "mkvtoolnix is not available"
fi

# Setup Python virtual environment
print_status "Setting up Python virtual environment..."
cd python_core

if [ -d "venv" ]; then
    print_warning "Virtual environment already exists. Removing old one..."
    rm -rf venv
fi

python3 -m venv venv
source venv/bin/activate

print_status "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "install_dependencies.sh" ]; then
    ./install_dependencies.sh
else
    # Install common dependencies
    pip install flask flask-cors requests pymediainfo pysmb tqdm
fi

cd ..

# Setup Node.js dependencies
print_status "Installing Node.js dependencies..."
cd web-app
npm install
cd ..

# Make scripts executable
print_status "Making scripts executable..."
chmod +x bin/*.sh 2>/dev/null || true
chmod +x python_core/*.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true

# Create LaunchAgents directory
print_status "Setting up macOS services..."
mkdir -p ~/Library/LaunchAgents
mkdir -p ~/Library/Logs

# Create Python service plist
cat > ~/Library/LaunchAgents/com.mediaprocessor.py.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mediaprocessor.py</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(pwd)/python_core/venv/bin/python</string>
        <string>$(pwd)/python_core/media_processor.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>StandardOutPath</key>
    <string>$(echo ~)/Library/Logs/media-processor-py.log</string>
    <key>StandardErrorPath</key>
    <string>$(echo ~)/Library/Logs/media-processor-py-error.log</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Create Web UI service plist
cat > ~/Library/LaunchAgents/com.mediaprocessor.ui.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mediaprocessor.ui</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$(pwd)/web-app/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)/web-app</string>
    <key>StandardOutPath</key>
    <string>$(echo ~)/Library/Logs/media-processor-ui.log</string>
    <key>StandardErrorPath</key>
    <string>$(echo ~)/Library/Logs/media-processor-ui-error.log</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3005</string>
    </dict>
</dict>
</plist>
EOF

print_success "macOS services created!"

# Load services
print_status "Loading services..."
launchctl load ~/Library/LaunchAgents/com.mediaprocessor.py.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.mediaprocessor.ui.plist 2>/dev/null || true

# Start services
print_status "Starting services..."
launchctl start com.mediaprocessor.py
launchctl start com.mediaprocessor.ui

# Wait a moment for services to start
sleep 3

# Check if services are running
print_status "Checking service status..."
if launchctl list | grep -q "com.mediaprocessor.py"; then
    print_success "Python processor service is running"
else
    print_warning "Python processor service may not be running"
fi

if launchctl list | grep -q "com.mediaprocessor.ui"; then
    print_success "Web UI service is running"
else
    print_warning "Web UI service may not be running"
fi

# Final instructions
echo ""
print_success "🎉 Media Processor setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit configuration: nano lib/config.sh"
echo "2. Configure your SMB server settings"
echo "3. Access web interface: http://localhost:3005"
echo ""
echo "🔧 Service Management:"
echo "• View logs: tail -f ~/Library/Logs/media-processor-*.log"
echo "• Stop services: launchctl stop com.mediaprocessor.py && launchctl stop com.mediaprocessor.ui"
echo "• Start services: launchctl start com.mediaprocessor.py && launchctl start com.mediaprocessor.ui"
echo "• Unload services: launchctl unload ~/Library/LaunchAgents/com.mediaprocessor.*.plist"
echo ""
echo "📖 For detailed documentation, see INSTALLATION.md"
echo ""

# Check if web interface is accessible
if command -v curl &> /dev/null; then
    sleep 2
    if curl -s http://localhost:3005 >/dev/null 2>&1; then
        print_success "Web interface is accessible at http://localhost:3005"
        echo "Opening web interface..."
        open http://localhost:3005
    else
        print_warning "Web interface may not be ready yet. Please wait a moment and try accessing http://localhost:3005"
    fi
fi