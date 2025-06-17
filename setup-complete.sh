#!/bin/bash

# Media Processor Complete Setup Script
# Consolidated installation and configuration

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Display welcome message
log_message "╔════════════════════════════════════════════╗"
log_message "║      Media Processor Complete Setup        ║"
log_message "╚════════════════════════════════════════════╝"
echo

# Check if running as root
if [ "$(id -u)" != "0" ]; then
  log_warning "This script should be run as root for full installation."
  log_warning "Some features may not work correctly without root privileges."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create .env file if it doesn't exist
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  log_message "Creating environment file..."
  
  # Prompt for SMB settings
  read -p "Enter SMB server (hostname or IP): " smb_server
  read -p "Enter SMB share name: " smb_share
  read -p "Enter SMB username: " smb_username
  read -s -p "Enter SMB password: " smb_password
  echo
  read -p "Enter SMB domain (optional, press Enter to skip): " smb_domain
  read -p "Enter web server port [3000]: " web_port
  web_port=${web_port:-3000}
  
  # Create .env file
  cat > "${SCRIPT_DIR}/.env" << EOF
# SMB Connection Settings
SMB_SERVER=${smb_server}
SMB_SHARE=${smb_share}
SMB_USERNAME=${smb_username}
SMB_PASSWORD=${smb_password}
SMB_DOMAIN=${smb_domain}

# Server Settings
PORT=${web_port}
LOG_LEVEL=info

# Media Processing Settings
MAX_CONCURRENT_OPERATIONS=3
THUMBNAIL_QUALITY=80
EOF
  
  # Set secure permissions
  chmod 600 "${SCRIPT_DIR}/.env"
  log_message "Environment file created successfully! ✓"
else
  log_message "Environment file already exists. Skipping creation."
fi

# Install dependencies
log_message "Installing system dependencies..."
apt-get update || {
  log_error "Failed to update package lists"
  exit 1
}

apt-get install -y ffmpeg smbclient mediainfo nodejs npm || {
  log_error "Failed to install system dependencies"
  exit 1
}

# Install Node.js dependencies
log_message "Installing Node.js dependencies..."
cd "${SCRIPT_DIR}" || {
  log_error "Failed to change to script directory"
  exit 1
}

# Run the dependency installation script
bash "${SCRIPT_DIR}/install-dependencies.sh" || {
  log_error "Failed to install Node.js dependencies"
  exit 1
}

# Build the web application
log_message "Building web application..."
bash "${SCRIPT_DIR}/build-web.sh" || {
  log_error "Failed to build web application"
  exit 1
}

# Install systemd service for web app
log_message "Installing web application service..."
bash "${SCRIPT_DIR}/setup-webapp-service.sh" || {
  log_error "Failed to install web application service"
  exit 1
}

# Set up diagnostics sudo privileges
log_message "Setting up diagnostics privileges..."
bash "${SCRIPT_DIR}/setup-diagnostics-sudo.sh" || {
  log_warning "Failed to set up diagnostics privileges"
}

# Final message
log_message "╔════════════════════════════════════════════╗"
log_message "║      Installation Complete! ✓              ║"
log_message "╚════════════════════════════════════════════╝"
log_message "You can now access the web interface at:"
log_message "http://localhost:${web_port:-3000}"
log_message ""
log_message "To start the services manually:"
log_message "sudo systemctl start media-processor-webapp.service"
log_message "sudo systemctl start media-processor.service"
log_message ""
log_message "Documentation:"
log_message "- README.md: General information"
log_message "- ENVIRONMENT_SETUP.md: Environment configuration details"
log_message "- DIAGNOSTICS-README.md: Troubleshooting guide" 