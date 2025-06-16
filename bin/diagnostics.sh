#!/bin/bash

# Media Processor Diagnostics Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
  echo -e "${GREEN}[DIAG] $1${NC}" >&2
}

log_warning() {
  echo -e "${YELLOW}[DIAG] WARNING: $1${NC}" >&2
}

log_error() {
  echo -e "${RED}[DIAG] ERROR: $1${NC}" >&2
}

# Load environment variables if available
ENV_FILE="$(dirname "$(dirname "$0")")/.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
  log_message "Loaded environment from $ENV_FILE"
fi

# Begin diagnostics
log_message "Starting comprehensive diagnostics..."

# Check if the Python processor service is running
PY_SERVICE_STATUS=$(systemctl is-active media-processor-py.service 2>/dev/null || echo "not-found")
log_message "Python processor service status: $PY_SERVICE_STATUS"

# Check if the API service is running
API_SERVICE_STATUS=$(systemctl is-active media-processor-api.service 2>/dev/null || echo "not-found")
log_message "API service status: $API_SERVICE_STATUS"

# Check if the UI service is running
UI_SERVICE_STATUS=$(systemctl is-active media-processor-ui.service 2>/dev/null || echo "not-found")
log_message "UI service status: $UI_SERVICE_STATUS"

# Check disk space
DISK_SPACE=$(df -h / | awk 'NR==2 {print $5}')
log_message "Disk space usage: $DISK_SPACE"

# Check memory usage
MEMORY_USAGE=$(free -h | grep Mem | awk '{print $3 "/" $2}')
log_message "Memory usage: $MEMORY_USAGE"

# Check system uptime
UPTIME=$(uptime -p)
log_message "System uptime: $UPTIME"

# Check if required tools are installed
TOOLS_CHECK=()

if command -v ffmpeg &> /dev/null; then
  TOOLS_CHECK+=("ffmpeg: ✓")
  FFMPEG_INSTALLED="true"
else
  TOOLS_CHECK+=("ffmpeg: ✗")
  FFMPEG_INSTALLED="false"
fi

if command -v smbclient &> /dev/null; then
  TOOLS_CHECK+=("smbclient: ✓")
  SMBCLIENT_INSTALLED="true"
else
  TOOLS_CHECK+=("smbclient: ✗")
  SMBCLIENT_INSTALLED="false"
fi

if command -v mediainfo &> /dev/null; then
  TOOLS_CHECK+=("mediainfo: ✓")
  MEDIAINFO_INSTALLED="true"
else
  TOOLS_CHECK+=("mediainfo: ✗")
  MEDIAINFO_INSTALLED="false"
fi

if command -v python3 &> /dev/null; then
  TOOLS_CHECK+=("python3: ✓")
  PYTHON_INSTALLED="true"
  PYTHON_VERSION=$(python3 --version)
  TOOLS_CHECK+=("python version: $PYTHON_VERSION")
else
  TOOLS_CHECK+=("python3: ✗")
  PYTHON_INSTALLED="false"
fi

log_message "Tools check:"
for tool in "${TOOLS_CHECK[@]}"; do
  echo "  - $tool" >&2
done

# Check SMB connectivity if credentials are available
SMB_CONNECTIVITY="unknown"
SMB_ERROR=""

if [ -n "$SMB_SERVER" ] && [ -n "$SMB_SHARE" ] && [ -n "$SMB_USERNAME" ]; then
  log_message "Testing SMB connectivity..."
  if [ -n "$SMB_PASSWORD" ]; then
    # Use a credentials file for the password to handle special characters
    SMB_CRED_FILE=$(mktemp)
    echo "username=$SMB_USERNAME" > "$SMB_CRED_FILE"
    echo "password=$SMB_PASSWORD" >> "$SMB_CRED_FILE"
    chmod 600 "$SMB_CRED_FILE"
    
    SMB_OUTPUT=$(smbclient -L "//$SMB_SERVER" -A "$SMB_CRED_FILE" -m SMB3 -t 3 -c 'exit' 2>&1)
    SMB_CONNECT_STATUS=$?
    
    # Remove the temporary credentials file
    rm -f "$SMB_CRED_FILE"
    
    if [ $SMB_CONNECT_STATUS -eq 0 ]; then
      SMB_CONNECTIVITY="success"
      log_message "SMB server connection: ✓"
      
      # Also test share access
      SMB_CRED_FILE=$(mktemp)
      echo "username=$SMB_USERNAME" > "$SMB_CRED_FILE"
      echo "password=$SMB_PASSWORD" >> "$SMB_CRED_FILE"
      chmod 600 "$SMB_CRED_FILE"
      
      SHARE_OUTPUT=$(smbclient "//$SMB_SERVER/$SMB_SHARE" -A "$SMB_CRED_FILE" -m SMB3 -t 3 -c 'ls' 2>&1)
      SHARE_CONNECT_STATUS=$?
      
      # Remove the temporary credentials file
      rm -f "$SMB_CRED_FILE"
      
      if [ $SHARE_CONNECT_STATUS -eq 0 ]; then
        SMB_SHARE_ACCESS="success"
        log_message "SMB share access: ✓"
      else
        SMB_SHARE_ACCESS="failed"
        SMB_ERROR="$SHARE_OUTPUT"
        log_error "SMB share access: ✗ ($SHARE_OUTPUT)"
      fi
    else
      SMB_CONNECTIVITY="failed"
      SMB_ERROR="$SMB_OUTPUT"
      log_error "SMB server connection: ✗ ($SMB_OUTPUT)"
    fi
  else
    SMB_CONNECTIVITY="no_password"
    log_warning "SMB password not provided, skipping connectivity test."
  fi
else
  SMB_CONNECTIVITY="not_configured"
  log_warning "SMB connection not configured (missing server, share or username)."
fi

# Check Python API endpoint accessibility
API_CONNECTIVITY="unknown"
if command -v curl &> /dev/null; then
  log_message "Testing API endpoint accessibility..."
  API_OUTPUT=$(curl -s -m 3 http://localhost:5001/api/status 2>&1)
  API_STATUS=$?
  
  if [ $API_STATUS -eq 0 ]; then
    API_CONNECTIVITY="success"
    log_message "API endpoint accessible: ✓"
  else
    API_CONNECTIVITY="failed"
    log_error "API endpoint not accessible: ✗ ($API_OUTPUT)"
  fi
else
  API_CONNECTIVITY="curl_missing"
  log_warning "curl not available, skipping API connectivity test."
fi

# Output as JSON
cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "system": {
    "uptime": "$UPTIME",
    "diskSpace": "$DISK_SPACE",
    "memoryUsage": "$MEMORY_USAGE"
  },
  "services": {
    "pythonProcessor": "$PY_SERVICE_STATUS",
    "apiServer": "$API_SERVICE_STATUS", 
    "webUi": "$UI_SERVICE_STATUS"
  },
  "tools": {
    "ffmpeg": $FFMPEG_INSTALLED,
    "smbclient": $SMBCLIENT_INSTALLED,
    "mediainfo": $MEDIAINFO_INSTALLED,
    "python": $PYTHON_INSTALLED
  },
  "connectivity": {
    "smb": "$SMB_CONNECTIVITY",
    "smbShareAccess": "$SMB_SHARE_ACCESS",
    "smbError": "$SMB_ERROR",
    "api": "$API_CONNECTIVITY"
  }
}
EOF

log_message "Diagnostics completed."
exit 0
