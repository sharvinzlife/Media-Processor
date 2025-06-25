#!/bin/bash

# Universal Dependency Installer for Media Processor
# Automatically detects platform and installs all required dependencies

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

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

print_status "🚀 Media Processor Universal Dependency Installer"
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Linux packages
install_linux_packages() {
    local distro=$1
    local packages_file="$SCRIPT_DIR/dependencies/linux-packages.txt"
    
    if [[ ! -f "$packages_file" ]]; then
        print_error "Package list file not found: $packages_file"
        return 1
    fi
    
    print_status "Installing packages for $distro..."
    
    case $distro in
        "ubuntu"|"debian")
            # Update package list
            sudo apt update
            
            # Read packages from file
            packages=$(grep -A 20 "\[ubuntu_debian\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
            print_status "Installing: $packages"
            sudo apt install -y $packages
            ;;
        "centos"|"rhel")
            # Enable EPEL repository
            sudo yum install -y epel-release
            
            packages=$(grep -A 20 "\[centos_rhel\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
            print_status "Installing: $packages"
            sudo yum install -y $packages
            
            # Install mkvtoolnix from EPEL
            sudo yum install -y mkvtoolnix
            ;;
        "fedora")
            packages=$(grep -A 20 "\[fedora\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
            print_status "Installing: $packages"
            sudo dnf install -y $packages
            ;;
        "arch")
            packages=$(grep -A 20 "\[arch\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
            print_status "Installing: $packages"
            sudo pacman -Sy --noconfirm $packages
            ;;
        "opensuse")
            packages=$(grep -A 20 "\[opensuse\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
            print_status "Installing: $packages"
            sudo zypper install -y $packages
            ;;
        *)
            print_error "Unsupported Linux distribution: $distro"
            return 1
            ;;
    esac
}

# Function to install macOS packages
install_macos_packages() {
    local packages_file="$SCRIPT_DIR/dependencies/macos-packages.txt"
    
    if [[ ! -f "$packages_file" ]]; then
        print_error "Package list file not found: $packages_file"
        return 1
    fi
    
    # Check if Homebrew is installed
    if ! command_exists brew; then
        print_status "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon Macs
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi
    
    # Update Homebrew
    print_status "Updating Homebrew..."
    brew update
    
    # Install packages
    packages=$(grep -A 20 "\[homebrew\]" "$packages_file" | grep -v "^\[" | grep -v "^#" | grep -v "^$" | tr '\n' ' ')
    print_status "Installing: $packages"
    
    for package in $packages; do
        if brew list "$package" &>/dev/null; then
            print_success "$package already installed"
        else
            print_status "Installing $package..."
            brew install "$package"
        fi
    done
    
    # Link Python if needed
    if ! command_exists python3; then
        print_status "Linking Python 3..."
        brew link --overwrite python@3.11
    fi
}

# Function to detect Linux distribution
detect_linux_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        case $ID in
            ubuntu|debian)
                echo "ubuntu"
                ;;
            centos|rhel)
                echo "centos"
                ;;
            fedora)
                echo "fedora"
                ;;
            arch|manjaro)
                echo "arch"
                ;;
            opensuse*)
                echo "opensuse"
                ;;
            *)
                echo "unknown"
                ;;
        esac
    else
        echo "unknown"
    fi
}

# Main installation logic
case "$OSTYPE" in
    linux-gnu*)
        print_status "Detected Linux system"
        distro=$(detect_linux_distro)
        print_status "Detected distribution: $distro"
        
        if [[ "$distro" == "unknown" ]]; then
            print_error "Unable to detect Linux distribution"
            print_status "Supported distributions: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, openSUSE"
            exit 1
        fi
        
        install_linux_packages "$distro"
        ;;
        
    darwin*)
        print_status "Detected macOS system"
        install_macos_packages
        ;;
        
    cygwin|msys|win32)
        print_error "Windows detected - use setup-windows.ps1 instead"
        print_status "Run: ./setup-windows.ps1"
        exit 1
        ;;
        
    *)
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
        ;;
esac

# Install Python dependencies
print_status "Installing Python dependencies..."

# Optional: Install uv for faster Python package management
if ! command_exists uv; then
    print_status "Installing uv for faster Python package management (optional)..."
    if command_exists curl; then
        curl -LsSf https://astral.sh/uv/install.sh | sh 2>/dev/null || {
            print_warning "Failed to install uv, will use standard pip instead"
        }
        # Add uv to PATH for current session if it was installed
        if [[ -f "$HOME/.cargo/bin/uv" ]]; then
            export PATH="$HOME/.cargo/bin:$PATH"
        fi
    fi
fi

cd "$SCRIPT_DIR/python_core"

# Check if install_dependencies.sh exists and is executable
if [[ -f "install_dependencies.sh" ]]; then
    print_status "Running Python dependency installer script..."
    chmod +x install_dependencies.sh
    ./install_dependencies.sh
else
    # Fallback to manual installation
    if [[ -d "venv" ]]; then
        print_warning "Using existing virtual environment..."
    else
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install from requirements.txt
    if [[ -f "requirements.txt" ]]; then
        print_status "Installing Python packages from requirements.txt..."
        pip install -r requirements.txt
    else
        print_status "Installing basic Python packages..."
        pip install flask flask-cors requests pymediainfo pysmb tqdm colorlog pyyaml python-dateutil watchdog netifaces psutil python-dotenv
    fi
fi

cd "$SCRIPT_DIR"

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd "$SCRIPT_DIR/web-app"

# Check if package.json exists
if [[ -f "package.json" ]]; then
    npm install
else
    print_warning "package.json not found, creating minimal setup..."
    npm init -y
    npm install express cors axios dotenv
fi

cd "$SCRIPT_DIR"

# Verify installations
print_status "Verifying installations..."

verify_command() {
    if command_exists "$1"; then
        version=$($1 --version 2>&1 | head -n1 || echo "version unknown")
        print_success "$1: $version"
        return 0
    else
        print_error "$1 not found"
        return 1
    fi
}

# Core tools
verify_command "git"
verify_command "node"
verify_command "python3"
verify_command "ffmpeg"
verify_command "mediainfo"

# Check MKV tools
if command_exists mkvmerge; then
    print_success "mkvtoolnix: $(mkvmerge --version | head -n1)"
else
    print_error "mkvtoolnix not found"
fi

# Check SMB client
if command_exists smbclient; then
    print_success "smbclient: available"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_warning "SMB client may be available through system tools"
else
    print_error "SMB client not found"
fi

# Final status
print_success "🎉 Dependency installation completed!"
echo ""
print_status "📋 Next steps:"
print_status "1. Configure settings: nano lib/config.sh"
print_status "2. Run platform setup:"
case "$OSTYPE" in
    linux-gnu*)
        print_status "   sudo ./bin/setup.sh"
        ;;
    darwin*)
        print_status "   ./setup-macos.sh"
        ;;
esac
print_status "3. Start services and access http://localhost:3005"
echo ""
print_status "📖 For detailed documentation, see INSTALLATION.md"