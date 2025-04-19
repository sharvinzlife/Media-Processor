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
    
    # Check if the file is locked by another process (still being written to)
    if command -v lsof >/dev/null 2>&1; then
        if lsof "$file" >/dev/null 2>&1; then
            log "File is currently being accessed by another process: $(basename "$file")"
            return 1
        fi
    fi
    
    # Check if file has been modified in the last 2 minutes (reduced from 5 minutes)
    # If it has, it might still be downloading
    local last_modified=$(stat -c %Y "$file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_modified))
    
    if [ $time_diff -lt 120 ]; then
        # Additional check: see if file size has changed in the last minute
        # If file size has been stable, it's probably done downloading
        local tmp_file="/tmp/$(basename "$file").size"
        local stable_size=true
        
        # Get current file size
        local current_size=$(du -b "$file" 2>/dev/null | cut -f1)
        
        # If we have a previous size check, compare sizes
        if [ -f "$tmp_file" ]; then
            local previous_size=$(cat "$tmp_file")
            
            # Check if the file has grown in size since last check
            if [ "$current_size" != "$previous_size" ]; then
                stable_size=false
            fi
        else
            # No previous check, so we can't confirm stability yet
            stable_size=false
        fi
        
        # Update the size file for future checks
        echo "$current_size" > "$tmp_file"
        
        # If size has changed, it's probably still downloading
        if [ "$stable_size" = false ]; then
            log "File modified recently and size is changing, likely still downloading: $(basename "$file")"
            return 1
        fi
        
        # If size is stable even though modified recently, it's probably done
        log "File modified recently but size is stable, treating as complete: $(basename "$file")"
    fi
    
    # Additional check for JDownloader - check for .part files
    local part_file="${file}.part"
    if [ -f "$part_file" ]; then
        log "Found .part file associated with $(basename "$file"), download in progress"
        return 1
    fi
    
    # Check for JDownloader/other downloader lock files
    if ls "${file}".*.lock >/dev/null 2>&1 || ls "${file}".part.*.lock >/dev/null 2>&1; then
        log "Found lock file associated with $(basename "$file"), download in progress"
        return 1
    fi
    
    # If we've made it this far, the file is probably complete
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

    # Log the full smbclient command for debugging
    log "[SMB] Running: smbclient '//$SMB_SERVER/$share' --authentication-file='$cred_file' -c \"$command\""

    # Run the command with the credentials file, capturing both stdout and stderr
    smbclient "//$SMB_SERVER/$share" --authentication-file="$cred_file" -c "$command" 2>&1 | tee "$output_file"
    status=${PIPESTATUS[0]}

    # Log the full output
    local smb_output=$(cat "$output_file")
    log "[SMB Output] $smb_output"

    # Remove the credentials file
    rm -f "$cred_file"

    # Check for common error messages in the output
    if echo "$smb_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND" > /dev/null; then
        log "ERROR: Access denied or path not found in command: $command"
        log "Error details: $(echo "$smb_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND")"
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
    if [[ $filename =~ (.*)[sS][0-9]{1,2}[eE][0-9]{1,2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)[sS][0-9]{1,2}[[:space:]]+[eE][pP][0-9]{1,2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)[eE][pP][0-9]{1,2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)([0-9]{1,2})[xX]([0-9]{1,2}) ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $filename =~ (.*)[sS]eason[[:space:]]*[0-9]+ ]]; then
        series_name="${BASH_REMATCH[1]}"
    else
        # If no pattern matches, use the whole filename but still try to remove episode markers
        series_name="$filename"
        # Try to remove any remaining episode patterns
        series_name=$(echo "$series_name" | sed -E 's/[eE][pP][0-9]{1,2}.*$//')
    fi
    
    # Clean up the series name - remove date/year in parentheses at the end
    series_name=$(echo "$series_name" | sed -E 's/\s+\([0-9]{4}\)$//')
    
    # Remove anything after "Season" if it exists
    series_name=$(echo "$series_name" | sed -E 's/\s+[sS]eason.*$//')
    
    # Clean up the series name - remove brackets, parentheses and their contents
    series_name=$(echo "$series_name" | sed -E 's/\[[^\]]*\]//g' | sed -E 's/\([^)]*\)//g')
    
    # Remove episode numbers and extra text
    series_name=$(echo "$series_name" | sed -E 's/\s+E[0-9]+.*$//')
    series_name=$(echo "$series_name" | sed -E 's/\s+Episode[[:space:]]+[0-9]+.*$//')
    
    # Clean up extra spaces
    series_name=$(echo "$series_name" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
    # If there's a dot or underscore followed by S01 or EP, cut it off
    series_name=$(echo "$series_name" | sed -E 's/[\._]+[sS][0-9]+.*$//')
    series_name=$(echo "$series_name" | sed -E 's/[\._]+[eE][pP][0-9]+.*$//')
    
    # Final removal of trailing dots, dashes, or underscores and spaces
    series_name=$(echo "$series_name" | sed -E 's/[\._\-]+$//g' | sed -E 's/\s+$//g')
    
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