#!/bin/bash

# Media Processor Setup Script
# This script helps set up and configure the Media Processor system

# Display ASCII art banner
echo "
▄▄       ▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░░▌     ▐░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░▌░▌   ▐░▐░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌
▐░▌▐░▌ ▐░▌▐░▌▐░▌          ▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌
▐░▌ ▐░▐░▌ ▐░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌
▐░▌  ▐░▌  ▐░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░▌   ▀   ▐░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░▌       ▐░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀█░█▀▀ 
▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌▐░▌          ▐░▌     ▐░▌  
▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌▐░▌          ▐░▌      ▐░▌ 
▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░▌ ▐░▌          ▐░▌       ▐░▌
 ▀         ▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀   ▀            ▀         ▀ 
                                                                  
 ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌          ▐░▌          ▐░▌          ▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░▌          ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░▌          ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░▌       ▐░▌▐░▌          ▐░█▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀█░█▀▀ 
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌          ▐░▌                    ▐░▌▐░▌     ▐░▌  
▐░▌       ▐░▌▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄█░▌▐░▌      ▐░▌ 
▐░▌       ▐░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
 ▀         ▀  ▀         ▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀ 
"

# Variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROCESSOR_SCRIPT="$SCRIPT_DIR/media-processor.sh"
WEB_APP_DIR="$SCRIPT_DIR/web-app"
API_DIR="$WEB_APP_DIR/api"
USERNAME=$(whoami)
LOG_FILE="/tmp/media-processor-setup.log"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Initialize log file
echo "Media Processor Setup Log - $(date)" > $LOG_FILE

# Helper functions
log_message() {
    echo -e "$1"
    echo "$(date): $1" >> $LOG_FILE
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

install_package() {
    log_message "${YELLOW}Installing $1...${NC}"
    sudo apt-get install -y "$1" >> $LOG_FILE 2>&1
    if [ $? -eq 0 ]; then
        log_message "${GREEN}Successfully installed $1${NC}"
        return 0
    else
        log_message "${RED}Failed to install $1${NC}"
        return 1
    fi
}

# Check if running as root and abort if true
if [ "$EUID" -eq 0 ]; then
    log_message "${RED}Please do not run this script as root or with sudo.${NC}"
    exit 1
fi

# Check for essential commands
log_message "${YELLOW}Checking for essential commands...${NC}"
essential_commands=("bash" "sudo" "grep" "awk" "sed")
missing_essential=false

for cmd in "${essential_commands[@]}"; do
    if ! check_command "$cmd"; then
        log_message "${RED}Missing essential command: $cmd${NC}"
        missing_essential=true
    fi
done

if [ "$missing_essential" = true ]; then
    log_message "${RED}Missing essential commands. Please install them and try again.${NC}"
    exit 1
fi

# Check sudo access
log_message "${YELLOW}Checking sudo access...${NC}"
if sudo -n true 2>/dev/null; then
    log_message "${GREEN}Sudo access confirmed${NC}"
else
    log_message "${YELLOW}You'll be prompted for your password to install necessary packages${NC}"
fi

# Update package lists
log_message "${YELLOW}Updating package lists...${NC}"
sudo apt-get update >> $LOG_FILE 2>&1
if [ $? -ne 0 ]; then
    log_message "${RED}Failed to update package lists. Check your internet connection.${NC}"
    exit 1
fi

# Install dependencies
log_message "${YELLOW}Installing dependencies...${NC}"
dependencies=("smbclient" "mediainfo" "ffmpeg" "mkvtoolnix" "jq" "nodejs" "npm")
missing_deps=()

for pkg in "${dependencies[@]}"; do
    if ! check_command "$pkg"; then
        missing_deps+=("$pkg")
    fi
done

# Install Node.js if not present
if ! check_command "node"; then
    log_message "${YELLOW}Node.js not found. Adding NodeSource repository...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        log_message "${RED}Failed to add NodeSource repository.${NC}"
        exit 1
    fi
    missing_deps+=("nodejs")
fi

# Install missing dependencies
for pkg in "${missing_deps[@]}"; do
    install_package "$pkg"
    if [ $? -ne 0 ]; then
        log_message "${RED}Failed to install $pkg. Setup cannot continue.${NC}"
        exit 1
    fi
done

# Make the processor script executable
log_message "${YELLOW}Making the processor script executable...${NC}"
chmod +x "$PROCESSOR_SCRIPT"
if [ $? -ne 0 ]; then
    log_message "${RED}Failed to make the processor script executable.${NC}"
    exit 1
fi

# Check if configuration needs updating
log_message "${YELLOW}Checking if configuration needs updating...${NC}"
if grep -q "SMB_PASSWORD='Tkrw%S\$!H2rAPC6x'" "$PROCESSOR_SCRIPT"; then
    log_message "${YELLOW}Default configuration detected. You should update the configuration in the media-processor.sh file.${NC}"
    read -p "Would you like to update the configuration now? (y/n): " update_config
    
    if [[ "$update_config" =~ ^[Yy]$ ]]; then
        read -p "Enter SMB server address: " smb_server
        read -p "Enter SMB share name: " smb_share
        read -p "Enter SMB username: " smb_user
        read -s -p "Enter SMB password: " smb_password
        echo ""
        
        # Update the configuration
        sed -i "s|SMB_SERVER=.*|SMB_SERVER=$smb_server|" "$PROCESSOR_SCRIPT"
        sed -i "s|SMB_SHARE=.*|SMB_SHARE=$smb_share|" "$PROCESSOR_SCRIPT"
        sed -i "s|SMB_USER=.*|SMB_USER=\"$smb_user\"|" "$PROCESSOR_SCRIPT"
        sed -i "s|SMB_PASSWORD=.*|SMB_PASSWORD='$smb_password'|" "$PROCESSOR_SCRIPT"
        
        log_message "${GREEN}Configuration updated successfully${NC}"
    else
        log_message "${YELLOW}Skipping configuration update. You can update it later via the web interface.${NC}"
    fi
fi

# Build the web interface
log_message "${YELLOW}Building the web interface...${NC}"
if [ -d "$WEB_APP_DIR" ]; then
    # Install frontend dependencies
    cd "$WEB_APP_DIR"
    log_message "${YELLOW}Installing frontend dependencies...${NC}"
    npm install >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        log_message "${RED}Failed to install frontend dependencies.${NC}"
        exit 1
    fi
    
    # Build the frontend
    log_message "${YELLOW}Building frontend...${NC}"
    npm run build >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        log_message "${RED}Failed to build frontend.${NC}"
        exit 1
    fi
    
    # Install backend dependencies
    cd "$API_DIR"
    log_message "${YELLOW}Installing backend dependencies...${NC}"
    npm install >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        log_message "${RED}Failed to install backend dependencies.${NC}"
        exit 1
    fi
    
    log_message "${GREEN}Web interface built successfully${NC}"
else
    log_message "${RED}Web app directory not found.${NC}"
    exit 1
fi

# Create systemd service files
log_message "${YELLOW}Creating systemd service files...${NC}"

# Media Processor Service
sudo tee /etc/systemd/system/media-processor.service > /dev/null << EOL
[Unit]
Description=Media Processor Service
After=network.target

[Service]
ExecStart=/bin/bash $PROCESSOR_SCRIPT
Restart=always
User=$USERNAME
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

if [ $? -ne 0 ]; then
    log_message "${RED}Failed to create media-processor.service${NC}"
    exit 1
fi

# Web Interface Service
sudo tee /etc/systemd/system/media-processor-web.service > /dev/null << EOL
[Unit]
Description=Media Processor Web Interface
After=network.target

[Service]
WorkingDirectory=$API_DIR
ExecStart=/usr/bin/node server.js
Restart=always
User=$USERNAME
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

if [ $? -ne 0 ]; then
    log_message "${RED}Failed to create media-processor-web.service${NC}"
    exit 1
fi

# Reload systemd
log_message "${YELLOW}Reloading systemd...${NC}"
sudo systemctl daemon-reload
if [ $? -ne 0 ]; then
    log_message "${RED}Failed to reload systemd${NC}"
    exit 1
fi

# Enable services
log_message "${YELLOW}Enabling services...${NC}"
sudo systemctl enable media-processor.service >> $LOG_FILE 2>&1
sudo systemctl enable media-processor-web.service >> $LOG_FILE 2>&1

# Start services
log_message "${YELLOW}Starting services...${NC}"
sudo systemctl start media-processor.service
sudo systemctl start media-processor-web.service

# Check service status
log_message "${YELLOW}Checking service status...${NC}"
if sudo systemctl is-active --quiet media-processor.service; then
    log_message "${GREEN}Media Processor service is running${NC}"
else
    log_message "${RED}Media Processor service failed to start${NC}"
fi

if sudo systemctl is-active --quiet media-processor-web.service; then
    log_message "${GREEN}Media Processor Web service is running${NC}"
else
    log_message "${RED}Media Processor Web service failed to start${NC}"
fi

# Get server IP
server_ip=$(hostname -I | awk '{print $1}')

# Installation completed
log_message "
${GREEN}=======================================================
 Media Processor System installed successfully!
=======================================================

${YELLOW}You can access the web interface at:${NC}
http://$server_ip:3001

${YELLOW}To monitor the services:${NC}
sudo systemctl status media-processor.service
sudo systemctl status media-processor-web.service

${YELLOW}To view the logs:${NC}
- Media Processor: journalctl -u media-processor.service -f
- Web Interface: journalctl -u media-processor-web.service -f

${YELLOW}For issues, check the logs and refer to the README.md files.${NC}
${GREEN}=======================================================${NC}
"

exit 0 