#!/bin/bash
#
# Media Processor - Logging Module
# Provides standardized logging functions
#

# Set default log file if not already defined
if [ -z "$LOG_FILE" ]; then
    LOG_FILE="/home/sharvinzlife/media-processor.log"
fi

# Create log file if it doesn't exist
if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "WARNING: Cannot create log file at $LOG_FILE. Logging to stdout only."
    fi
fi

# Enable debug logging by default
DEBUG_LOG_ENABLED=${DEBUG_LOG_ENABLED:-true}

# Function to log messages with timestamp
log() {
    local message="$(date) - $1"
    echo "$message" >> "$LOG_FILE" 2>/dev/null
    echo "$message"
}

# Function to log debug messages (only if debug logging is enabled)
debug_log() {
    if [ "$DEBUG_LOG_ENABLED" = true ]; then
        local message="$(date) - DEBUG: $1"
        echo "$message" >> "$LOG_FILE" 2>/dev/null
        # Uncomment to show debug logs in stdout as well
        # echo "$message"
    fi
}

# Function to log error messages
error_log() {
    local message="$(date) - ERROR: $1"
    echo "$message" >> "$LOG_FILE" 2>/dev/null
    echo "$message" >&2  # Print to stderr
}

# Function to log warning messages
warn_log() {
    local message="$(date) - WARNING: $1"
    echo "$message" >> "$LOG_FILE" 2>/dev/null
    echo "$message"
}

# Alias for backward compatibility
log_debug() {
    debug_log "$1"
}

log_error() {
    error_log "$1"
}

log_warning() {
    warn_log "$1"
} 