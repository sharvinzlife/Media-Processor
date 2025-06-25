#!/bin/bash

# Media Processor Setup Script
# This script sets up systemd services for the Media Processor on Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This script is designed for Linux only!"
    print_status "For other platforms, use:"
    print_status "• macOS: ./setup-macos.sh"
    print_status "• Windows: ./setup-windows.ps1"
    exit 1
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_status "🐧 Setting up Media Processor on Linux..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

print_status "Base directory: $BASE_DIR"

# Install dependencies if not already installed
print_status "Checking dependencies..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if universal dependency installer exists
if [ -f "$BASE_DIR/install-dependencies.sh" ]; then
    print_status "Running universal dependency installer..."
    cd "$BASE_DIR"
    ./install-dependencies.sh
    cd "$BASE_DIR"
else
    print_warning "Universal installer not found, using fallback method..."
    
    # Fallback: Check for required dependencies
    missing_deps=()

    if ! command_exists node; then
        missing_deps+=("nodejs")
    fi

    if ! command_exists npm; then
        missing_deps+=("npm")
    fi

    if ! command_exists python3; then
        missing_deps+=("python3")
    fi

    if ! command_exists pip3; then
        missing_deps+=("python3-pip")
    fi

    if ! command_exists ffmpeg; then
        missing_deps+=("ffmpeg")
    fi

    if ! command_exists mediainfo; then
        missing_deps+=("mediainfo")
    fi

    if ! command_exists smbclient; then
        missing_deps+=("smbclient")
    fi

    if ! command_exists mkvmerge; then
        missing_deps+=("mkvtoolnix")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_warning "Missing dependencies: ${missing_deps[*]}"
        print_status "Installing missing dependencies..."
        
        # Detect package manager and install dependencies
        if command_exists apt; then
            # Ubuntu/Debian
            apt update
            apt install -y "${missing_deps[@]}" python3-venv
        elif command_exists yum; then
            # CentOS/RHEL
            yum install -y epel-release
            yum install -y "${missing_deps[@]}" python3-venv
        elif command_exists dnf; then
            # Fedora
            dnf install -y "${missing_deps[@]}" python3-venv
        elif command_exists pacman; then
            # Arch Linux
            pacman -Sy --noconfirm "${missing_deps[@]}"
        elif command_exists zypper; then
            # openSUSE
            zypper install -y "${missing_deps[@]}" python3-venv
        else
            print_error "Could not detect package manager. Please install dependencies manually:"
            printf '%s\n' "${missing_deps[@]}"
            print_status "Run: ./install-dependencies.sh"
            print_status "Then run this script again."
            exit 1
        fi
    else
        print_success "All dependencies are installed"
    fi
fi

# Verify Node.js version
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    print_warning "Node.js version $node_version detected. Version 18+ is recommended."
fi

# Verify Python version
python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
python_major=$(echo $python_version | cut -d'.' -f1)
python_minor=$(echo $python_version | cut -d'.' -f2)

if [ "$python_major" -lt 3 ] || [ "$python_major" -eq 3 -a "$python_minor" -lt 8 ]; then
    print_error "Python $python_version detected. Python 3.8+ is required."
    exit 1
fi

# Setup Python virtual environment
print_status "Setting up Python virtual environment..."
cd "$BASE_DIR/python_core"

# Check if virtual environment exists
venv_exists=false
venv_path=""

if [ -d "venv" ] && [ -f "venv/bin/activate" ]; then
    venv_exists=true
    venv_path="venv"
elif [ -d ".venv" ] && [ -f ".venv/bin/activate" ]; then
    venv_exists=true
    venv_path=".venv"
fi

if [ "$venv_exists" = true ]; then
    print_status "Using existing virtual environment: $venv_path"
    source "$venv_path/bin/activate"
else
    print_status "Creating new Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Install Python dependencies
if [ -f "install_dependencies.sh" ]; then
    print_status "Installing Python dependencies via script..."
    chmod +x install_dependencies.sh
    ./install_dependencies.sh
elif [ -f "requirements.txt" ]; then
    print_status "Installing Python dependencies from requirements.txt..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    print_status "Installing basic Python dependencies..."
    pip install --upgrade pip
    pip install flask flask-cors requests pymediainfo pysmb tqdm python-dotenv
fi

cd "$BASE_DIR"

# Create .env file if it doesn't exist
if [ ! -f "$BASE_DIR/.env" ]; then
    if [ -f "$BASE_DIR/.env.example" ]; then
        print_status "Creating .env file from example..."
        cp "$BASE_DIR/.env.example" "$BASE_DIR/.env"
        print_warning "Please edit .env file with your configuration!"
    else
        print_warning "No .env file found. Please create one based on the documentation."
    fi
else
    print_status ".env file already exists"
fi

# Setup Node.js dependencies
print_status "Setting up Node.js dependencies..."
cd "$BASE_DIR/web-app"
npm install
cd "$BASE_DIR"

# Create systemd service files
print_status "Creating systemd service files..."

# Python service
cat > /etc/systemd/system/media-processor-py.service << EOF
[Unit]
Description=Media Processor Python Service
After=network.target

[Service]
Type=simple
User=media-processor
Group=media-processor
WorkingDirectory=$BASE_DIR
Environment=PATH=$BASE_DIR/python_core/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$BASE_DIR/python_core/venv/bin/python $BASE_DIR/python_core/media_processor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Web UI service
cat > /etc/systemd/system/media-processor-ui.service << EOF
[Unit]
Description=Media Processor Web UI
After=network.target

[Service]
Type=simple
User=media-processor
Group=media-processor
WorkingDirectory=$BASE_DIR/web-app
Environment=NODE_ENV=production
Environment=PORT=3005
ExecStart=/usr/bin/node $BASE_DIR/web-app/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# API service (if exists)
if [ -f "$BASE_DIR/python_core/api_server.py" ]; then
    cat > /etc/systemd/system/media-processor-api.service << EOF
[Unit]
Description=Media Processor API Service
After=network.target

[Service]
Type=simple
User=media-processor
Group=media-processor
WorkingDirectory=$BASE_DIR/python_core
Environment=PATH=$BASE_DIR/python_core/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$BASE_DIR/python_core/venv/bin/python $BASE_DIR/python_core/api_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
fi

# Create media-processor user if it doesn't exist
if ! id "media-processor" &>/dev/null; then
    print_status "Creating media-processor user..."
    useradd -r -s /bin/false media-processor
fi

# Set ownership and permissions
print_status "Setting up permissions..."
chown -R media-processor:media-processor "$BASE_DIR"
chmod +x "$BASE_DIR"/bin/*.sh 2>/dev/null || true
chmod +x "$BASE_DIR"/python_core/*.sh 2>/dev/null || true
chmod +x "$BASE_DIR"/*.sh 2>/dev/null || true

# Reload systemd and enable services
print_status "Enabling systemd services..."
systemctl daemon-reload
systemctl enable media-processor-py.service
systemctl enable media-processor-ui.service

if [ -f "/etc/systemd/system/media-processor-api.service" ]; then
    systemctl enable media-processor-api.service
fi

print_success "Setup complete!"
echo ""
print_status "📋 Next Steps:"
print_status "1. Configure settings in .env file:"
print_status "   nano $BASE_DIR/.env"
print_status ""
print_status "2. Start services (choose one method):"
print_status ""
print_status "   Option A - Manual start (recommended for testing):"
print_status "   ./start-services.sh"
print_status ""
print_status "   Option B - Systemd services:"
print_status "   sudo systemctl start media-processor-py.service"
print_status "   sudo systemctl start media-processor-ui.service"
print_status ""
print_status "🔧 Service Management:"
print_status "• Manual: ./stop-services.sh (or ./stop-services.sh --keep-web)"
print_status "• Systemd status: sudo systemctl status media-processor-py.service"
print_status "• View logs: journalctl -u media-processor-py.service -f"
print_status ""
print_status "🌐 Web Interface:"
print_status "• URL: http://localhost:3005"
print_status "• Use the web interface to start/stop services"
print_status ""
print_warning "⚠️  Remember to configure your SMB settings in .env file!"
print_status ""
print_status "📖 For detailed documentation, see README.md and INSTALLATION.md"

echo
print_success "🎉 Media Processor setup completed successfully!"