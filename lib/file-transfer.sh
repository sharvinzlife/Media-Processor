#!/bin/bash
#
# Media Processor - File Transfer Module
# This file contains functions for transferring files to SMB shares
#

# Source required modules
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"
source "$SCRIPT_DIR/core-utils.sh"

# Function to verify and create root media directory
verify_root_media_dir() {
    log "Verifying root media directory exists"

    # Check if the media directory exists at the root level
    run_smb_command "$SMB_SHARE" "cd media" > /dev/null 2>&1
    local dir_status=$?

    if [ $dir_status -ne 0 ]; then
        run_smb_command "$SMB_SHARE" "mkdir media" > /dev/null 2>&1
        dir_status=$?
        if [ $dir_status -ne 0 ]; then
            log "ERROR: Failed to create root media directory"
            return 1
        fi
        log "Successfully created root media directory"
    else
        log "Root media directory exists"
    fi

    return 0
}

# Function to determine target directory based on media type and language
determine_target_directory() {
    local file="$1"
    local language="$2"
    local media_type="$3"
    local cleaned_name="$4"
    
    local target_dir=""
    
    # Debug logging
    debug_log "Determining target directory:"
    debug_log "File: $file"
    debug_log "Language: $language"
    debug_log "Media Type: $media_type"
    debug_log "Cleaned Name: $cleaned_name"
    
    # Video files (movies and TV shows)
    if [[ "${file##*.}" =~ ^(mkv|mp4|avi|m4v|mov)$ ]]; then
        if [ "$media_type" = "tvshow" ]; then
            if [ "$language" = "malayalam" ]; then
                target_dir="$MALAYALAM_TV_PATH"
            else
                target_dir="$ENGLISH_TV_PATH"
            fi
            
            # Add series subfolder
            local series_name=$(extract_series_name "$cleaned_name")
            target_dir="$target_dir/$series_name"
            
            # Add season subfolder
            local season_folder=$(get_season_folder "$cleaned_name")
            target_dir="$target_dir/$season_folder"
        else
            # Movies
            if [ "$language" = "malayalam" ]; then
                target_dir="$MALAYALAM_MOVIES_PATH"
            else
                target_dir="$ENGLISH_MOVIES_PATH"
            fi
            
            # Add movie subfolder
            local folder_name=$(echo "$cleaned_name" | sed -E 's/\.[^.]+$//')
            target_dir="$target_dir/$folder_name"
        fi
    fi
    
    echo "$target_dir"
}

# Unified file transfer function
transfer_file() {
    local source_file="$1"
    local target_dir="$2"
    local final_filename="$3"
    local retries=3
    
    debug_log "Starting file transfer:"
    debug_log "Source: $source_file"
    debug_log "Target Directory: $target_dir"
    debug_log "Final Filename: $final_filename"
    
    # Validate inputs
    if [ ! -f "$source_file" ]; then
        log_error "Source file does not exist: $source_file"
        return 1
    fi
    
    if [ -z "$target_dir" ] || [ -z "$final_filename" ]; then
        log_error "Target directory or filename not specified"
        return 1
    fi
    
    # Create target directory structure
    create_parent_directories "$target_dir" || return 1
    
    # Skip if in dry run mode
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would transfer $final_filename to $target_dir"
        return 0
    fi
    
    # Perform transfer with retries
    local attempt=1
    local transfer_successful=false
    
    while [ $attempt -le $retries ] && [ "$transfer_successful" = false ]; do
        debug_log "Transfer attempt $attempt of $retries"
        
        local temp_dir=$(mktemp -d)
        local batch_file="$temp_dir/smb.batch"
        local log_file="$temp_dir/smb.log"
        
        cat > "$batch_file" << EOF
cd "$target_dir"
lcd "$(dirname "$source_file")"
put "$(basename "$source_file")" "$final_filename"
quit
EOF
        
        if smbclient "//$SMB_SERVER/$SMB_SHARE" \
            -U "$SMB_USER%$SMB_PASSWORD" \
            -m SMB3 \
            -b 65536 \
            -c "source $batch_file" > "$log_file" 2>&1; then
            
            transfer_successful=true
            debug_log "Transfer successful on attempt $attempt"
        else
            debug_log "Transfer failed on attempt $attempt"
            if [ $attempt -lt $retries ]; then
                sleep $((attempt * 2))
            fi
        fi
        
        rm -rf "$temp_dir"
        attempt=$((attempt + 1))
    done
    
    if [ "$transfer_successful" = true ]; then
        log "Successfully transferred: $final_filename"
        return 0
    else
        log_error "Failed to transfer file after $retries attempts"
        return 1
    fi
}
