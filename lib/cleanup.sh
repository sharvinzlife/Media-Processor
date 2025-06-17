#!/bin/bash
#
# Media Processor - Cleanup Module
# This file contains functions for cleaning up temporary files and directories
#

# Source the configuration and utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

# Function to cleanup leftover RAR files
cleanup_rar_files() {
    if [ "$CLEANUP_RAR_FILES" != true ]; then
        log "RAR cleanup disabled, skipping"
        return
    fi
    
    log "Starting cleanup of leftover RAR files"
    
    # Find directories containing RAR files
    find "$SOURCE_DIR" -maxdepth 2 -type f -name "*.rar" | sort | while read rar_file; do
        local dir=$(dirname "$rar_file")
        local dirname=$(basename "$dir")
        local filename=$(basename "$rar_file")
        
        log "Found RAR file: $rar_file"
        
        # Check if there are any media files in the parent directory 
        # that might still need to be extracted
        local has_unprocessed_media=false
        
        if find "$dir" -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) | grep -q .; then
            # Has media files, check if they are all processed
            local all_processed=true
            find "$dir" -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) | while read mediafile; do
                if ! is_download_complete "$mediafile"; then
                    all_processed=false
                    break
                fi
            done
            
            if [ "$all_processed" = false ]; then
                has_unprocessed_media=true
            fi
        fi
        
        # Only cleanup if there are no unprocessed media files
        if [ "$has_unprocessed_media" = false ]; then
            # Check if the RAR file is older than MIN_RAR_AGE_HOURS
            if [ "$MIN_RAR_AGE_HOURS" -gt 0 ]; then
                local file_age_seconds=$(( $(date +%s) - $(stat -c %Y "$rar_file") ))
                local file_age_hours=$(( file_age_seconds / 3600 ))
                
                if [ "$file_age_hours" -lt "$MIN_RAR_AGE_HOURS" ]; then
                    log "Skipping RAR file: $rar_file (age: ${file_age_hours}h < ${MIN_RAR_AGE_HOURS}h)"
                    continue
                fi
            fi
            
            if [ "$DRY_RUN" = true ]; then
                log "DRY RUN: Would remove RAR file: $rar_file"
            else
                log "Removing RAR file: $rar_file"
                rm "$rar_file"
            fi
        else
            log "Skipping RAR file: $rar_file (unprocessed media files found)"
        fi
    done
    
    log "RAR file cleanup completed"
}

# Function to cleanup empty directories
cleanup_empty_dirs() {
    if [ "$CLEANUP_EMPTY_DIRS" != true ]; then
        log "Empty directory cleanup disabled, skipping"
        return
    fi
    
    log "Starting cleanup of empty directories"
    
    # Find all directories in the source directory
    find "$SOURCE_DIR" -type d -not -path "$SOURCE_DIR" -not -path "$SOURCE_DIR/Media extractor" | sort -r | while read dir; do
        # Check if directory is empty
        if [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
            # Skip the root JDownloader directory and other protected paths
            if [ "$dir" = "/home/sharvinzlife/Documents/JDownloader" ] || \
               [ "$(basename "$dir")" = "JDownloader" ]; then
                log "Preserving root directory: $dir"
                continue
            fi
            
            if [ "$DRY_RUN" = true ]; then
                log "DRY RUN: Would remove empty directory: $dir"
            else
                log "Removing empty directory: $dir"
                rmdir "$dir"
            fi
        fi
    done
    
    log "Empty directory cleanup completed"
}

# Function to clean up temporary files after processing
cleanup_temp_files() {
    local temp_dir="$1"
    
    if [ -d "$temp_dir" ]; then
        log "Cleaning up temporary directory: $temp_dir"
        rm -rf "$temp_dir"
    fi
}

# Function to clean up original files after successful transfer
cleanup_original_files() {
    local file="$1"
    local transfer_success="$2"
    
    if [ "$CLEAN_ORIGINAL_FILES" != true ]; then
        log "Original file cleanup disabled, skipping"
        return
    fi
    
    if [ "$transfer_success" != "true" ]; then
        log "Transfer was not successful, keeping original file: $(basename "$file")"
        return
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would remove original file: $file"
    else
        log "Removing original file: $file"
        rm -f "$file"
        
        # Remove empty directories
        local dir=$(dirname "$file")
        if [ -d "$dir" ] && [ -z "$(ls -A "$dir")" ]; then
            # Don't remove protected directories
            if [ "$dir" = "/home/sharvinzlife/Documents/JDownloader" ] || \
               [ "$dir" = "$SOURCE_DIR" ] || \
               [ "$(basename "$dir")" = "JDownloader" ]; then
                log "Preserving root directory: $dir"
            else
                log "Removing empty directory: $dir"
                rmdir "$dir"
            fi
        fi
    fi
}

# Function to perform all cleanup operations
perform_cleanup() {
    log "Starting cleanup operations"
    
    # Clean up RAR files
    if [ "$CLEANUP_RAR_FILES" = true ]; then
        cleanup_rar_files
    fi
    
    # Clean up empty directories
    if [ "$CLEANUP_EMPTY_DIRS" = true ]; then
        cleanup_empty_dirs
    fi
    
    log "Cleanup operations completed"
}