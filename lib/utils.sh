#!/bin/bash
#
# Media Processor - Utilities Module
# This file contains common utility functions for the Media Processor system
#

# Source the configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"

# Function to log messages with timestamp
log() {
    local message="$(date) - $1"
    echo "$message" >> "$LOG_FILE"
    echo "$message"
}

# Check required tools
check_required_tools() {
    local missing_tools=()
    
    # Check for smbclient
    if ! command -v smbclient &> /dev/null; then
        missing_tools+=("smbclient")
    fi
    
    # Check for mediainfo
    if ! command -v mediainfo &> /dev/null; then
        missing_tools+=("mediainfo")
    fi
    
    # Check for ffmpeg
    if ! command -v ffmpeg &> /dev/null; then
        missing_tools+=("ffmpeg")
    fi
    
    # Check for mkvmerge and mkvextract
    if ! command -v mkvmerge &> /dev/null; then
        missing_tools+=("mkvmerge")
    fi
    
    if ! command -v mkvextract &> /dev/null; then
        missing_tools+=("mkvextract")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR: Missing required tools: ${missing_tools[*]}"
        log "Please install them with: sudo apt-get install ${missing_tools[*]}"
        return 1
    fi
    
    return 0
}

# Function to check if a download is complete
# This helps avoid processing incomplete files
is_download_complete() {
    local file="$1"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # Check if file meets minimum size requirement (10MB)
    local filesize=$(du -k "$file" 2>/dev/null | cut -f1)
    if [ ${filesize:-0} -lt 10000 ]; then
        log "File too small, may be incomplete: $(basename "$file") ($filesize KB)"
        return 1
    fi
    
    # Check if file has been modified in the last 5 minutes
    # If it has, it might still be downloading
    local last_modified=$(stat -c %Y "$file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_modified))
    
    if [ $time_diff -lt 300 ]; then
        log "File modified recently, may still be downloading: $(basename "$file")"
        return 1
    fi
    
    return 0
}

# Function to run SMB command with authentication
run_smb_command() {
    local share="$1"
    local command="$2"
    local output_file=$(mktemp)
    local status=0
    
    # Create a credentials file
    local cred_file=$(mktemp)
    echo "username=$SMB_USER" > "$cred_file"
    echo "password=$SMB_PASSWORD" >> "$cred_file"
    
    # Run the command with the credentials file
    log "Running SMB command on $SMB_SERVER/$share"
    smbclient "//$SMB_SERVER/$share" --authentication-file="$cred_file" -c "$command" 2>&1 | tee "$output_file"
    status=${PIPESTATUS[0]}
    
    # Remove the credentials file
    rm -f "$cred_file"
    
    # Check for common error messages in the output
    local error_output=$(cat "$output_file")
    if echo "$error_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND" > /dev/null; then
        log "ERROR: Access denied or path not found in command: $command"
        log "Error details: $(echo "$error_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND")"
        status=1
    fi
    
    rm -f "$output_file"
    return $status
}

# Function to check SMB connection
check_smb_connection() {
    log "Testing SMB connection to $SMB_SERVER/$SMB_SHARE"
    
    # Create a credentials file
    local cred_file=$(mktemp)
    echo "username=$SMB_USER" > "$cred_file"
    echo "password=$SMB_PASSWORD" >> "$cred_file"
    
    # Try to list shares on the server first
    log "Testing with username: $SMB_USER"
    smbclient -L $SMB_SERVER --authentication-file="$cred_file" 2>&1 | tee -a $LOG_FILE
    local list_status=${PIPESTATUS[0]}
    
    # Remove the credentials file
    rm -f "$cred_file"
    
    if [ $list_status -ne 0 ]; then
        log "ERROR: Failed to connect to SMB server $SMB_SERVER. Check if the server is reachable."
        return 1
    fi
    
    log "Verifying share exists: $SMB_SHARE"
    run_smb_command "$SMB_SHARE" "ls" > /dev/null
    
    if [ $? -ne 0 ]; then
        log "ERROR: $SMB_SHARE share does not exist or cannot be accessed."
        return 1
    fi
    
    log "Successfully connected to SMB share $SMB_SERVER/$SMB_SHARE"
    return 0
}

# Function to verify SMB path exists
verify_smb_path() {
    local path="$1"
    
    log "Verifying path exists: $path"
    run_smb_command "$SMB_SHARE" "cd \"$path\"" > /dev/null
    
    if [ $? -ne 0 ]; then
        log "WARNING: '$path' directory may not exist in $SMB_SHARE share"
        
        # Try to create the path
        create_parent_directories "$path"
        return $?
    fi
    
    log "Path exists: $path"
    return 0
}

# Function to create parent directories recursively
create_parent_directories() {
    local path="$1"
    local parts=()
    local current=""
    
    # Split path into components
    IFS='/' read -ra parts <<< "$path"
    
    # Build path one directory at a time and create as needed
    for part in "${parts[@]}"; do
        if [ -n "$part" ]; then  # Skip empty parts
            if [ -z "$current" ]; then
                current="$part"
            else
                current="$current/$part"
            fi
            
            # Try to access this directory
            run_smb_command "$SMB_SHARE" "cd \"$current\"" > /dev/null
            if [ $? -ne 0 ]; then
                log "Creating parent directory: $current"
                # The directory doesn't exist, create it
                run_smb_command "$SMB_SHARE" "mkdir \"$current\"" > /dev/null
                if [ $? -ne 0 ]; then
                    log "Warning: Could not create directory $current"
                    return 1
                fi
            fi
        fi
    done
    
    return 0
}

# Get folder name from a filename (for creating movie folders)
get_folder_name() {
    local filename="$1"
    
    # Remove file extension
    local name_without_ext="${filename%.*}"
    
    # Remove any resolution, quality, or year info in brackets
    local clean_name=$(echo "$name_without_ext" | sed -E 's/\[[^\]]*\]//g' | sed -E 's/\([^)]*\)//g')
    
    # Remove extra spaces and trim
    clean_name=$(echo "$clean_name" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
    echo "$clean_name"
}

# Extract series name from filename
extract_series_name() {
    local filename="$1"
    local series_name=""
    
    # Try to extract series name before season/episode markers
    if [[ $filename =~ (.*)[sS][0-9]{2}[eE][0-9]{2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)([0-9]{1,2})[xX]([0-9]{2}) ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)[sS]eason[[:space:]]*[0-9]+ ]]; then
        series_name="${BASH_REMATCH[1]}"
    else
        # If no pattern matches, use the whole filename
        series_name="$filename"
    fi
    
    # Clean up the series name
    series_name=$(echo "$series_name" | sed -E 's/\[[^\]]*\]//g' | sed -E 's/\([^)]*\)//g')
    series_name=$(echo "$series_name" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
    echo "$series_name"
}

# Get season folder name from filename
get_season_folder() {
    local filename="$1"
    local season_folder="Season 01"  # Default
    
    # Try to match S01E01 format
    if [[ $filename =~ [sS]([0-9]{1,2})[eE][0-9]{1,2} ]]; then
        local season="${BASH_REMATCH[1]}"
        season_folder=$(printf "Season %02d" "$season")
    # Try alternative formats like 1x01
    elif [[ $filename =~ ([0-9]{1,2})[xX][0-9]{1,2} ]]; then
        local season="${BASH_REMATCH[1]}"
        season_folder=$(printf "Season %02d" "$season")
    # Try to extract from filenames with just Season 1, etc.
    elif [[ $filename =~ [sS]eason[[:space:]]*([0-9]+) ]]; then
        local season="${BASH_REMATCH[1]}"
        season_folder=$(printf "Season %02d" "$season")
    fi
    
    echo "$season_folder"
}