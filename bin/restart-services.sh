#!/bin/bash

# Restart script for Media Processor services
# This script restarts both the media processor service and the web interface

# Source the configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/../lib/config.sh"

# Log file for restart operations
RESTART_LOG="/tmp/media-processor-restart.log"

# Function to log messages
log_restart() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RESTART_LOG"
}

log_restart "Starting service restart procedure"

# Restart the media processor service
log_restart "Restarting media-processor.service"
systemctl restart media-processor.service
if [ $? -eq 0 ]; then
    log_restart "Successfully restarted media-processor.service"
else
    log_restart "Failed to restart media-processor.service"
    systemctl status media-processor.service | tee -a "$RESTART_LOG"
fi

# Restart the web interface service
log_restart "Restarting media-processor-web.service"
systemctl restart media-processor-web.service
if [ $? -eq 0 ]; then
    log_restart "Successfully restarted media-processor-web.service"
else
    log_restart "Failed to restart media-processor-web.service"
    systemctl status media-processor-web.service | tee -a "$RESTART_LOG"
fi

# Check if services are running
log_restart "Checking service status"
systemctl is-active --quiet media-processor.service
MP_STATUS=$?

systemctl is-active --quiet media-processor-web.service
WEB_STATUS=$?

if [ $MP_STATUS -eq 0 ] && [ $WEB_STATUS -eq 0 ]; then
    log_restart "All services are running successfully"
else
    log_restart "WARNING: One or more services failed to start"
    [ $MP_STATUS -ne 0 ] && log_restart "media-processor.service is not running"
    [ $WEB_STATUS -ne 0 ] && log_restart "media-processor-web.service is not running"
fi

log_restart "Restart procedure completed"

# Output final status
echo "Media Processor services restart completed."
echo "Check $RESTART_LOG for details."
