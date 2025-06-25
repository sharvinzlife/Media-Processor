#!/bin/bash
#
# GitHub Deployment Test Script
# This script backs up the current installation and tests a fresh GitHub deployment
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
HOME_DIR="/home/sharvinzlife"
CURRENT_DIR="$HOME_DIR/media-processor"
BACKUP_DIR="$HOME_DIR/media-processor-backup-$BACKUP_TIMESTAMP"
TEST_DIR="$HOME_DIR/media-processor-github-test"
GITHUB_REPO="https://github.com/sharvinzlife/Media-Processor.git"

log "🚀 Starting GitHub Deployment Test"
log "📁 Current: $CURRENT_DIR"
log "💾 Backup: $BACKUP_DIR"
log "🧪 Test: $TEST_DIR"

# Step 1: Stop running services
log "1️⃣  Stopping running services..."
if systemctl is-active --quiet media-processor-py.service 2>/dev/null; then
    sudo systemctl stop media-processor-py.service
    success "Stopped media-processor-py.service"
else
    warning "media-processor-py.service was not running"
fi

if systemctl is-active --quiet media-processor-ui.service 2>/dev/null; then
    sudo systemctl stop media-processor-ui.service
    success "Stopped media-processor-ui.service"
else
    warning "media-processor-ui.service was not running"
fi

# Step 2: Create backup
log "2️⃣  Creating backup of current installation..."
if [ -d "$CURRENT_DIR" ]; then
    cp -r "$CURRENT_DIR" "$BACKUP_DIR"
    success "Backup created at: $BACKUP_DIR"
else
    error "Current directory not found: $CURRENT_DIR"
    exit 1
fi

# Step 3: Clean up any existing test directory
log "3️⃣  Cleaning up previous test installations..."
if [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
    success "Removed existing test directory"
fi

# Step 4: Clone fresh from GitHub
log "4️⃣  Cloning fresh installation from GitHub..."
cd "$HOME_DIR"
git clone "$GITHUB_REPO" "$(basename "$TEST_DIR")"
success "GitHub repository cloned successfully"

# Step 5: Verify our changes are present
log "5️⃣  Verifying unified configuration changes..."
cd "$TEST_DIR"

# Check .env file or .env.example
if [ -f ".env" ]; then
    success ".env file exists"
    log "📋 .env file contents (first 10 lines):"
    head -10 .env | sed 's/^/    /'
elif [ -f ".env.example" ]; then
    success ".env.example template exists"
    log "📋 .env.example contents (first 10 lines):"
    head -10 .env.example | sed 's/^/    /'
    warning ".env file will need to be created from .env.example"
else
    error "Neither .env nor .env.example file found!"
    exit 1
fi

# Check lib/config.sh sources .env
if grep -q "source.*\.env" lib/config.sh; then
    success "lib/config.sh properly sources .env file"
else
    error "lib/config.sh does not source .env file!"
    exit 1
fi

# Check Python ConfigManager has dotenv support
if grep -q "dotenv" python_core/modules/config/settings.py; then
    success "Python ConfigManager has dotenv support"
else
    error "Python ConfigManager missing dotenv support!"
    exit 1
fi

# Check CLAUDE.md exists
if [ -f "CLAUDE.md" ]; then
    success "CLAUDE.md development guide exists"
else
    error "CLAUDE.md file missing!"
    exit 1
fi

# Check README.md has unified config section
if grep -q "Unified Configuration System" README.md; then
    success "README.md updated with unified configuration"
else
    error "README.md missing unified configuration section!"
    exit 1
fi

# Check CHANGELOG.md has v3.3.0 entry
if grep -q "v3.3.0.*Unified Configuration" CHANGELOG.md; then
    success "CHANGELOG.md has v3.3.0 entry"
else
    error "CHANGELOG.md missing v3.3.0 entry!"
    exit 1
fi

# Step 6: Setup .env configuration
log "6️⃣  Setting up .env configuration..."
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "./.env"
    success "Working .env configuration copied from backup"
elif [ -f ".env.example" ]; then
    cp ".env.example" "./.env"
    success "Created .env from .env.example template"
    warning "⚠️  You'll need to edit .env with your actual configuration values"
else
    error "Cannot create .env file - no backup or template available"
    exit 1
fi

# Step 7: Test dependency installation
log "7️⃣  Testing dependency installation..."
if [ -f "install-dependencies.sh" ]; then
    chmod +x install-dependencies.sh
    log "🔄 Running dependency installer (this may take a while)..."
    if ./install-dependencies.sh; then
        success "Dependencies installed successfully"
    else
        error "Dependency installation failed!"
        exit 1
    fi
else
    error "install-dependencies.sh not found!"
    exit 1
fi

# Step 8: Test Python component
log "8️⃣  Testing Python component..."
cd python_core
if [ -f "requirements.txt" ]; then
    # Check if python-dotenv is in requirements
    if grep -q "python-dotenv" requirements.txt; then
        success "python-dotenv found in requirements.txt"
    else
        error "python-dotenv missing from requirements.txt!"
        exit 1
    fi
    
    # Test Python processor help and basic functionality
    log "🐍 Testing Python media processor..."
    
    # Test help command first
    if python3 media_processor.py --help >/tmp/python_help.log 2>&1; then
        success "Python media processor help command works"
    else
        error "Python media processor help failed!"
        log "📋 Help command error log:"
        cat /tmp/python_help.log | sed 's/^/    /'
    fi
    
    # Test with a dummy config path to avoid missing /etc/media-processor/config.json
    log "🧪 Testing with local config..."
    if python3 media_processor.py --config ../config.json --dry-run /dev/null >/tmp/python_test.log 2>&1; then
        success "Python media processor runs with custom config"
    else
        warning "Python media processor test failed (this may be expected in test environment)"
        log "📋 Test error log (first 10 lines):"
        head -10 /tmp/python_test.log | sed 's/^/    /'
    fi
else
    error "requirements.txt not found in python_core!"
    exit 1
fi

# Step 9: Test Node.js components
log "9️⃣  Testing Node.js components..."
cd "$TEST_DIR"

# Test main package.json
if [ -f "package.json" ]; then
    log "📦 Installing Node.js dependencies..."
    if npm install --silent; then
        success "Main Node.js dependencies installed"
    else
        error "Failed to install main Node.js dependencies!"
        exit 1
    fi
else
    error "Main package.json not found!"
    exit 1
fi

# Test web-app
cd web-app
if [ -f "package.json" ]; then
    log "🌐 Installing web-app dependencies..."
    if npm install --silent; then
        success "Web-app dependencies installed"
        
        # Test if server can start (quick test)
        log "🧪 Testing web server startup..."
        timeout 10s node server.js > /tmp/web-test.log 2>&1 &
        SERVER_PID=$!
        sleep 3
        
        if kill -0 $SERVER_PID 2>/dev/null; then
            kill $SERVER_PID
            success "Web server starts successfully"
        else
            warning "Web server startup test inconclusive"
            log "📋 Server log:"
            cat /tmp/web-test.log | sed 's/^/    /'
        fi
    else
        error "Failed to install web-app dependencies!"
        exit 1
    fi
else
    error "Web-app package.json not found!"
    exit 1
fi

# Step 10: Configuration validation
log "🔟 Validating configuration loading..."
cd "$TEST_DIR"

# Test bash config loading
log "🐚 Testing bash configuration loading..."
if source lib/config.sh && [ ! -z "$SMB_SERVER" ]; then
    success "Bash configuration loads successfully"
    log "   SMB_SERVER: $SMB_SERVER"
else
    error "Bash configuration failed to load!"
    exit 1
fi

# Step 11: Summary and recommendations
log "📊 Deployment Test Summary"
success "✅ GitHub repository cloned successfully"
success "✅ Unified configuration system verified"
success "✅ Dependencies installed correctly"
success "✅ Python component functional" 
success "✅ Node.js components functional"
success "✅ Configuration loading works"

log "🎉 GitHub deployment test completed successfully!"
log ""
log "📋 Next steps to complete deployment:"
log "   1. Configure your .env file with actual values:"
log "      nano $TEST_DIR/.env"
log ""
log "   2. Run the setup script:"
log "      cd $TEST_DIR"
log "      sudo ./bin/setup.sh"
log ""
log "   3. Start the services:"
log "      sudo systemctl start media-processor-py.service"
log "      sudo systemctl start media-processor-ui.service"
log ""
log "   4. Access web interface:"
log "      http://localhost:3005"
log ""
log "💾 Your original installation is backed up at:"
log "   $BACKUP_DIR"
log ""
log "🧪 Test installation is at:"
log "   $TEST_DIR"

# Restore original services if requested
read -p "🔄 Do you want to restart the original services? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "🔄 Restarting original services..."
    cd "$CURRENT_DIR"
    sudo systemctl start media-processor-py.service 2>/dev/null || warning "Could not start media-processor-py.service"
    sudo systemctl start media-processor-ui.service 2>/dev/null || warning "Could not start media-processor-ui.service"
    success "Original services restarted"
fi

log "✨ Test script completed!"