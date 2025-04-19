#!/bin/bash
#
# Media Processor - Main Script
# This is the main entry point for the Media Processor system
#

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$BASE_DIR/lib"

# Source all modules
source "$LIB_DIR/config.sh"
source "$LIB_DIR/utils.sh"
source "$LIB_DIR/media-detection.sh"
source "$LIB_DIR/language-extraction.sh"
source "$LIB_DIR/file-transfer.sh"
source "$LIB_DIR/cleanup.sh"

# Create log file if it doesn't exist
touch $LOG_FILE
echo "$(date) - Media processor started" >> $LOG_FILE

# Function to process a media file
process_media_file() {
    local file="$1"
    local filename=$(basename "$file")
    local file_extension="${file##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')
    
    log "Processing file: $filename"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: Source file does not exist: $file"
        return 1
    fi
    
    # Check if file meets minimum size requirement
    local filesize=$(du -k "$file" 2>/dev/null | cut -f1)
    if [ ${filesize:-0} -lt 10000 ]; then
        log "File too small, may be incomplete: $filename ($filesize KB)"
        return 1
    fi
    
    # Clean the filename for better organization
    local cleaned_name=$(clean_filename "$filename")
    log "Cleaned filename: $cleaned_name"
    
    # Detect language from filename
    local language=$(identify_language "$cleaned_name")
    log "Identified language: $language"
    
    # Detect if this is a TV show or movie
    local media_type=$(identify_media_type "$cleaned_name")
    log "Identified as $media_type: $cleaned_name"
    
    # Analyze file for language tracks if it's a video file
    local detected_languages=""
    
    if [[ "$file_extension_lower" =~ ^(mkv|mp4|avi|m4v|mov)$ ]]; then
        extract_language_tracks "$file"
        local extraction_status=$?
        
        if [ $extraction_status -ne 0 ]; then
            log "WARNING: Failed to extract language information from $filename (continuing with filename-based detection)"
        fi
    fi
    
    # Determine target directory based on language, media type and file extension
    local target_dir=$(determine_target_directory "$file" "$language" "$media_type" "$cleaned_name")
    
    if [ -z "$target_dir" ]; then
        log "ERROR: Could not determine target directory for $filename"
        return 1
    fi
    
    log "Target directory: $target_dir"
    
    # Extract Malayalam language track if needed and EXTRACT_AUDIO_TRACKS is enabled
    local processed_file="$file"
    local temp_file=""
    local use_extracted=false
    
    if [[ "$EXTRACT_AUDIO_TRACKS" = true && 
          "$language" = "malayalam" && 
          "$file_extension_lower" = "mkv" ]]; then
        
        log "Attempting to extract Malayalam audio track from: $filename"
        
        # Process language extraction
        local extracted_file=$(process_language_extraction "$file" "$language")
        local extraction_status=$?
        
        if [ $extraction_status -eq 0 ] && [ -n "$extracted_file" ] && [ -f "$extracted_file" ]; then
            log "Successfully extracted Malayalam audio to: $(basename "$extracted_file")"
            processed_file="$extracted_file"
            use_extracted=true
        else
            log "No Malayalam audio extracted, using original file"
            processed_file="$file"
        fi
    fi
    
    # Format final filename with the improved naming
    local final_filename=""
    
    if [ "$media_type" = "tvshow" ]; then
        # For TV shows, get the formatted episode name
        local series_name=$(extract_series_name "$cleaned_name")
        local season_episode=$(extract_season_episode "$cleaned_name")
        local base_tv_name="${series_name} ${season_episode}"
        
        final_filename=$(format_media_filename "$processed_file" "$base_tv_name" "$detected_languages")
    else
        # For movies or other content
        final_filename=$(format_media_filename "$processed_file" "$cleaned_name" "$detected_languages")
    fi
    
    log "Formatted filename: $final_filename"
    
    # Copy the file to SMB share with the new filename
    if [ ! -z "$target_dir" ]; then
        # Create a temporary copy with the formatted name for copying
        local temp_dir=$(mktemp -d)
        local formatted_file="$temp_dir/$final_filename"
        
        # Skip copy if we're already using a temp file from extraction
        if [ "$use_extracted" = true ]; then
            # Rename the extracted file to our formatted name
            mv "$processed_file" "$formatted_file"
        else
            # Copy the original to our formatted name
            cp "$processed_file" "$formatted_file"
        fi
        
        # Copy the formatted file
        transfer_media_file "$file" "$formatted_file" "$target_dir"
        local transfer_status=$?
        
        # Clean up temporary files
        rm -f "$formatted_file"
        if [ "$use_extracted" = true ]; then
            rm -rf "$(dirname "$processed_file")"
        fi
        rmdir "$temp_dir"
        
        if [ $transfer_status -eq 0 ]; then
            log "Successfully processed: $filename -> $final_filename"
            
            # If configured to clean up originals after successful transfer
            if [ "$CLEAN_ORIGINAL_FILES" = true ]; then
                cleanup_original_files "$file" "true"
            fi
            
            return 0
        else
            log "ERROR: Failed to copy $filename to SMB share"
            log "KEEPING original file for retry: $file"
            return 1
        fi
    else
        log "ERROR: No target directory determined for $filename"
        return 1
    fi
}

# Function to process directories with media content
process_media_directory() {
    local dir="$1"
    local dirname=$(basename "$dir")
    
    # Skip if not a directory
    if [ ! -d "$dir" ]; then
        return
    fi
    
    log "Processing directory: $dirname"
    
    # Find media files inside the directory
    find "$dir" -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) | while read mediafile; do
        process_media_file "$mediafile"
    done
    
    # Check if directory is now empty and can be removed
    if [ -z "$(ls -A "$dir")" ]; then
        if [ "$DRY_RUN" = true ]; then
            log "DRY RUN: Would remove empty directory: $dir"
        else
            log "Removing empty directory: $dir"
            rmdir "$dir"
        fi
    fi
}

# Function to process a directory
process_directory() {
    local dir="$1"
    
    # Skip if SMB is not connected and this would require file transfer
    if [ "$SMB_CONNECTED" = false ]; then
        log "Skipping directory processing for $dir as SMB is not connected"
        return
    fi
    
    # Check if the directory contains any completed media files
    find "$dir" -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) -not -path "*/\.*" | while read mediafile; do
        if is_download_complete "$mediafile"; then
            process_media_file "$mediafile"
        fi
    done
    
    # Check if directory is now empty and can be removed
    if [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        if [ "$DRY_RUN" = true ]; then
            log "DRY RUN: Would remove empty directory: $dir"
        else
            log "Removing empty directory: $dir"
            rmdir "$dir"
        fi
    fi
}

# Main processing function
main() {
    log "Starting media monitoring for $SOURCE_DIR"
    
    if [ "$DRY_RUN" = true ]; then
        log "Operating mode: DRY RUN - no files will be copied or deleted"
    else
        log "Operating mode: NORMAL"
    fi
    
    # Check required tools first
    check_required_tools
    if [ $? -ne 0 ]; then
        log "ERROR: Required tools are missing. Exiting."
        exit 1
    fi
    
    # Test SMB connection and share accessibility
    SMB_CONNECTED=false
    check_smb_connection
    if [ $? -ne 0 ]; then
        log "WARNING: SMB connection test failed. Will continue running and retry later."
        SMB_CONNECTED=false
    else
        SMB_CONNECTED=true
        
        # Verify root media directory exists if SMB is connected
        verify_root_media_dir
        if [ $? -ne 0 ]; then
            log "WARNING: Root media directory verification failed. Will continue running and retry later."
        else
            log "Verifying media directories exist"
            verify_smb_path "$MALAYALAM_MOVIE_PATH"
            verify_smb_path "$MALAYALAM_TV_PATH"
            verify_smb_path "$ENGLISH_MOVIE_PATH"
            verify_smb_path "$ENGLISH_TV_PATH"
        fi
    fi
    
    # Find directories to monitor (with -type d to get only directories)
    DIRS_TO_MONITOR=$(find "$SOURCE_DIR" -type d | grep -v "node_modules\|\.git")
    
    # Main processing loop
    while true; do
        # Try to reconnect SMB if previously failed
        if [ "$SMB_CONNECTED" = false ]; then
            log "Retrying SMB connection..."
            check_smb_connection
            if [ $? -eq 0 ]; then
                log "SMB connection successfully established"
                SMB_CONNECTED=true
                
                # Verify directories after successful connection
                verify_root_media_dir
                verify_smb_path "$MALAYALAM_MOVIE_PATH"
                verify_smb_path "$MALAYALAM_TV_PATH"
                verify_smb_path "$ENGLISH_MOVIE_PATH"
                verify_smb_path "$ENGLISH_TV_PATH"
            fi
        fi
        
        # Continue with normal processing regardless of SMB status
        for dir in $DIRS_TO_MONITOR; do
            # Skip web-app directories
            if [[ "$dir" == *"web-app"* ]]; then
                continue
            fi
            
            if [ -d "$dir" ]; then
                process_directory "$dir"
            fi
        done
        
        # Perform cleanup tasks
        perform_cleanup
        
        log "Sleeping for 60 seconds before next scan..."
        sleep 60
    done
}

# Start the main process
main