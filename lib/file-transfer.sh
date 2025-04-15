#!/bin/bash
#
# Media Processor - File Transfer Module
# This file contains functions for transferring files to SMB shares
#

# Source the configuration and utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

# Function to verify and create root media directory
verify_root_media_dir() {
    log "Verifying root media directory exists"
    
    # Check if the media directory exists at the root level
    run_smb_command "$SMB_SHARE" "cd media" > /dev/null 2>&1
    local dir_status=$?
    
    if [ $dir_status -ne 0 ]; then
        log "Root media directory doesn't exist. Attempting to create it."
        run_smb_command "$SMB_SHARE" "mkdir media" > /dev/null 2>&1
        local mkdir_status=$?
        
        if [ $mkdir_status -ne 0 ]; then
            log "ERROR: Failed to create root media directory. Check permissions."
            return 1
        fi
        log "Successfully created root media directory"
    else
        log "Root media directory exists"
    fi
    
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

# Function to copy files to SMB share
copy_to_smb() {
    local source_file="$1"
    local target_dir="$2"
    local filename=$(basename "$source_file")
    
    # Define the target path properly
    local smb_target_path="//$SMB_SERVER/$SMB_SHARE/$target_dir"
    
    log "Copying $filename to SMB share: $smb_target_path"
    
    # Skip if in dry run mode
    if [ "$DRY_RUN" = true ]; then
        log "DRY-RUN: Would copy $filename to $smb_target_path"
        return 0
    fi
    
    # Create directory structure using recursive approach
    create_parent_directories "$target_dir"
    if [ $? -ne 0 ]; then
        log "ERROR: Failed to create directory structure: $target_dir"
        return 1
    fi
    
    # First verify we can access the target directory
    run_smb_command "$SMB_SHARE" "cd \"$target_dir\"" > /dev/null
    if [ $? -ne 0 ]; then
        log "ERROR: Cannot access target directory $target_dir"
        return 1
    fi
    
    # Check if target file already exists
    run_smb_command "$SMB_SHARE" "cd \"$target_dir\"; ls \"$filename\"" > /dev/null 2>&1
    local file_exists=$?
    
    if [ $file_exists -eq 0 ] && [ "$OVERWRITE_EXISTING" != "true" ]; then
        log "Target file already exists and OVERWRITE_EXISTING is disabled. Skipping: $filename"
        return 0
    fi
    
    # Copy the file using the direct command approach
    run_smb_command "$SMB_SHARE" "cd \"$target_dir\"; put \"$source_file\" \"$filename\"" > /dev/null
    local copy_status=$?
    
    if [ $copy_status -ne 0 ]; then
        log "ERROR: Failed to copy file: $filename (Status: $copy_status)"
        return 1
    fi
    
    # Verify file exists on target
    run_smb_command "$SMB_SHARE" "cd \"$target_dir\"; ls \"$filename\"" > /dev/null
    local verify_status=$?
    
    if [ $verify_status -ne 0 ]; then
        log "ERROR: Verification failed - target file not found after copy: $target_dir/$filename"
        return 1
    fi
    
    log "Successfully copied and verified: $filename to $target_dir/"
    return 0
}

# Function to determine target directory based on media type and language
determine_target_directory() {
    local file="$1"
    local language="$2"
    local media_type="$3"
    local cleaned_name="$4"
    local file_extension="${file##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')
    
    local target_dir=""
    
    # Video files (movies and TV shows)
    if [[ "$file_extension_lower" =~ ^(mkv|mp4|avi|m4v|mov)$ ]]; then
        if [ "$language" = "malayalam" ]; then
            if [ "$media_type" = "tvshow" ]; then
                target_dir="$MALAYALAM_TV_PATH"
                
                # For TV shows, get series name and season
                local series_name=$(extract_series_name "$cleaned_name")
                local season_dir=$(get_season_folder "$cleaned_name")
                target_dir="$target_dir/$series_name/$season_dir"
            else
                # It's a movie
                target_dir="$MALAYALAM_MOVIE_PATH"
                
                # For movies, create a folder with movie name
                local movie_folder=$(get_folder_name "$cleaned_name")
                target_dir="$target_dir/$movie_folder"
            fi
        else
            # Default to English
            if [ "$media_type" = "tvshow" ]; then
                target_dir="$ENGLISH_TV_PATH"
                
                # For TV shows, get series name and season
                local series_name=$(extract_series_name "$cleaned_name")
                local season_dir=$(get_season_folder "$cleaned_name")
                target_dir="$target_dir/$series_name/$season_dir"
            else
                # It's a movie
                target_dir="$ENGLISH_MOVIE_PATH"
                
                # For movies, create a folder with movie name
                local movie_folder=$(get_folder_name "$cleaned_name")
                target_dir="$target_dir/$movie_folder"
            fi
        fi
    # Audio files
    elif [[ "$file_extension_lower" =~ ^(mp3|flac|aac|m4a)$ ]]; then
        target_dir="$DEFAULT_MEDIA_PATH/audio"
    # Image files
    elif [[ "$file_extension_lower" =~ ^(jpg|jpeg|png|gif|webp)$ ]]; then
        target_dir="$DEFAULT_MEDIA_PATH/images"
    # Other files
    else
        log "Unknown file extension: $file_extension_lower, using default directory"
        target_dir="$DEFAULT_MEDIA_PATH/other"
    fi
    
    echo "$target_dir"
}

# Function to transfer a processed media file to the SMB share
transfer_media_file() {
    local file="$1"
    local formatted_file="$2"
    local target_dir="$3"
    
    # Skip if in dry run mode
    if [ "$DRY_RUN" = true ]; then
        log "DRY-RUN: Would transfer $formatted_file to $target_dir"
        return 0
    fi
    
    # Copy the file to SMB share
    copy_to_smb "$formatted_file" "$target_dir"
    local copy_status=$?
    
    if [ $copy_status -eq 0 ]; then
        log "Successfully transferred: $(basename "$formatted_file") to $target_dir"
        return 0
    else
        log "ERROR: Failed to transfer $(basename "$formatted_file") to SMB share"
        return 1
    fi
}