#!/bin/bash
#
# Media Processor - Main Script
# Orchestrates the media processing workflow
#

# Set base directory and source libraries
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
LIB_DIR="$SCRIPT_DIR/../lib"

# Custom log function to use until logger.sh is properly loaded
log() {
    echo "$(date) - $1"
}

# Source required libraries with error checking
source_lib() {
    local lib_file="$1"
    if [ -f "$LIB_DIR/$lib_file" ]; then
        source "$LIB_DIR/$lib_file"
        if [ $? -ne 0 ]; then
            # Use echo directly since logger might not be sourced yet
            log "ERROR: Failed to source $lib_file"
            exit 1
        fi
    else
        log "ERROR: Required library file not found: $LIB_DIR/$lib_file"
        exit 1
    fi
}

# First, source the logger library
source_lib "logger.sh"

# Then source other libraries with error checking
source_lib "utils.sh"
source_lib "file-transfer.sh"
source_lib "config.sh"
source_lib "dashboard-api.sh"
source_lib "media-utils.sh"

# Try to source media-detection.sh with special handling
if [ -f "$LIB_DIR/media-detection.sh" ]; then
    source "$LIB_DIR/media-detection.sh"
    if [ $? -ne 0 ]; then
        log "ERROR: Failed to source media-detection.sh"
        exit 1
    fi
else
    log "ERROR: Required library file not found: $LIB_DIR/media-detection.sh"
    exit 1
fi

source_lib "cleanup.sh"

# Define path to the language extraction script
LANGUAGE_EXTRACTION_SCRIPT="$LIB_DIR/language-extraction.sh"
if [ ! -f "$LANGUAGE_EXTRACTION_SCRIPT" ]; then
    log "ERROR: Language extraction script not found at $LANGUAGE_EXTRACTION_SCRIPT"
    exit 1
fi
chmod +x "$LANGUAGE_EXTRACTION_SCRIPT"

# --- REMOVED OBSOLETE FUNCTION CHECK --- #

# --- Main Processing Function for a Single File ---
process_media_file() {
    local file="$1"
    local original_filename=$(basename "$file")
    local file_extension="${original_filename##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')

    log "Processing file: $original_filename"

    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: Source file does not exist: $file"
        return 1
    fi

    # Check if file meets minimum size requirement
    if ! is_download_complete "$file"; then
         # is_download_complete logs the reason
        return 1
    fi

    # Use the cleaned_filename function from media-detection.sh instead of local implementation
    local cleaned_base_name=$(clean_filename "$original_filename")
    log "Cleaned base filename: $cleaned_base_name"

    # Identify language based on the *original* filename
    local identified_language=$(identify_language "$file")
    log "Identified language: $identified_language"

    # If language is unknown, try detecting by examining audio tracks directly
    # This is a fallback for when the filename doesn't have language indicators
    if [ "$identified_language" = "unknown" ] && [ "$file_extension_lower" = "mkv" ]; then
        log "Attempting to identify language from audio tracks in the file"
        
        # Check for Malayalam audio tracks using mkvmerge
        local malayalam_tracks=""
        malayalam_tracks=$(detect_audio_tracks_mkvmerge "$file" "mal" 2>/dev/null)
        if [ -n "$malayalam_tracks" ]; then
            log "Malayalam audio tracks found in file with unknown language: $malayalam_tracks"
            identified_language="malayalam"
        else
            # Check with mediainfo as a fallback
            local audio_langs=$(mediainfo --Output='Audio;%Language%\n' "$file" | tr '[:upper:]' '[:lower:]')
            if [[ "$audio_langs" =~ (mal|malayalam) ]]; then
                log "Malayalam audio detected via mediainfo in file with unknown language"
                identified_language="malayalam"
            else
                # Default to English if no Malayalam tracks found and language is unknown
                log "No Malayalam audio detected, defaulting to English for unknown language file"
                identified_language="english"
            fi
        fi
        log "Updated language identification: $identified_language"
    fi

    # Identify media type (movie/tvshow) based on cleaned name
    local media_type=$(identify_media_type "$cleaned_base_name")
    log "Identified as $media_type: $cleaned_base_name"

    # --- Language Extraction Step ---
    # This function returns the path to the file to use (original or extracted)
    # It also exports EXTRACTED_TEMP_DIR if a temp file was created
    local file_to_process=""
    log "Starting language extraction process for $cleaned_base_name..."
    
    # Define potential extracted file path
    local temp_dir="/tmp/media-processor/$(basename "$file" | sed 's/[^a-zA-Z0-9]/_/g')"
    local potential_extracted_file="$temp_dir/$(basename "${file%.*}")-mal.mkv"
    
    # Change from calling a function to executing the external script
    local extraction_output
    extraction_output=$("$LANGUAGE_EXTRACTION_SCRIPT" "$file" "$identified_language" "$potential_extracted_file" 2>&1)
    local extraction_step_status=$?
    
    # Log the extraction output except any line containing the marker
    echo "$extraction_output" | grep -v "EXTRACTION_OUTPUT_PATH_MARKER:" | while IFS= read -r line; do
        log "$line"
    done
    
    # Extract the path specifically from the marker line
    local marker_line=$(echo "$extraction_output" | grep "EXTRACTION_OUTPUT_PATH_MARKER:")
    if [ -n "$marker_line" ]; then
        file_to_process=${marker_line#*EXTRACTION_OUTPUT_PATH_MARKER:}
        log "Extracted file path from marker: $file_to_process"
    else
        # No marker found, use original file
        log "No extraction path marker found. Using original file."
        file_to_process="$file"
        extraction_step_status=1  # Force error status since marker is missing
    fi
    
    local temp_dir_to_clean="$EXTRACTED_TEMP_DIR" # Capture the exported variable
    log "Extraction process completed with status: $extraction_step_status"
    
    # Check if the extracted file exists
    if [ ! -f "$file_to_process" ]; then
        log "ERROR: Extracted file does not exist: $file_to_process"
        log "Falling back to original file."
        file_to_process="$file"
        extraction_step_status=1
    fi

    if [ $extraction_step_status -ne 0 ]; then
        log "ERROR during language processing step for $original_filename. Skipping transfer."
        # Clean up temp dir if it exists from a failed extraction attempt
        if [ -n "$temp_dir_to_clean" ] && [ -d "$temp_dir_to_clean" ]; then
            log "Cleaning up temporary directory from failed extraction: $temp_dir_to_clean"
            rm -rf "$temp_dir_to_clean"
        fi
        return 1  # Exit the processing function with error
    fi

    # Check if the file_to_process actually exists (important if extraction failed silently)
    if [ ! -f "$file_to_process" ]; then
        log "ERROR: File to process does not exist after language extraction step: $file_to_process. Original: $file"
        if [ -n "$temp_dir_to_clean" ] && [ -d "$temp_dir_to_clean" ]; then
             rm -rf "$temp_dir_to_clean"
        fi
        return 1
    fi
    
    # Check for language override marker - If the language extraction detected Malayalam audio
    # but the filename didn't indicate Malayalam, we'll override the language detection
    if [ -n "$temp_dir_to_clean" ] && [ -f "$temp_dir_to_clean/.language_override" ]; then
        local override_language=$(cat "$temp_dir_to_clean/.language_override")
        if [ -n "$override_language" ]; then
            log "Language override detected: changing from $identified_language to $override_language"
            identified_language="$override_language"
        fi
    fi

    # --- Filename Formatting ---
    # Further clean the base name by removing language tags like [Tam+Mal+...]
    local final_cleaned_base_name=$(clean_language_tags "$cleaned_base_name")
    log "Final cleaned base name (tags removed): $final_cleaned_base_name"

    # Determine target directory based on *original* language/type
    local target_dir=$(determine_target_directory "$file" "$identified_language" "$media_type" "$final_cleaned_base_name")
    log "Target directory: $target_dir"

    # Format final filename using our unified format_media_name function
    local final_filename=""
    
    if [ "$media_type" = "tvshow" ]; then
        # For TV shows, we need to ensure the series name and episode info is preserved
        local series_name=$(extract_series_name "$final_cleaned_base_name")
        local season_episode=$(extract_season_episode "$final_cleaned_base_name")
        local base_tv_name="${series_name} ${season_episode}"
        
        # Create a temporary named file to use with format_media_name
        local temp_tv_file=$(mktemp)
        cp "$file_to_process" "$temp_tv_file"
        
        # Rename the temp file with the TV base name
        local temp_tv_named_file="${temp_tv_file}.${file_extension}"
        mv "$temp_tv_file" "$temp_tv_named_file"
        
        # Format using our unified function with keep_tags option
        final_filename=$(format_media_name "$temp_tv_named_file" "keep_tags")
        
        # Clean up temp file
        rm -f "$temp_tv_named_file"
    else
        # For movies, we can directly use the unified function
        final_filename=$(format_media_name "$file_to_process")
    fi
    
    log "Formatted filename: $final_filename"

    # --- File Transfer ---
    # Ensure target_dir is a clean path without any embedded timestamps or messages
    if [ -n "$target_dir" ]; then
        # Clean target directory - extract only the actual path without timestamps
        # This filters out any lines that start with a timestamp pattern
        if [[ "$target_dir" == *" - "* ]] || [[ "$target_dir" == *"DEBUG:"* ]]; then
            log "Target directory contains log messages, cleaning..."
            # Extract the last line that looks like a path
            local clean_dir=$(echo "$target_dir" | grep -v "^[A-Za-z]* [A-Za-z]* [0-9]* [0-9]*:[0-9]*:[0-9]* [A-Z]* [0-9]* -" | grep -v "DEBUG:" | tail -1)
            
            if [ -n "$clean_dir" ]; then
                log "Cleaned target directory from '$target_dir' to '$clean_dir'"
                target_dir="$clean_dir"
            else
                log "ERROR: Could not clean target directory path"
                # Clean up temp dir if it exists
                if [ -n "$temp_dir_to_clean" ] && [ -d "$temp_dir_to_clean" ]; then
                     rm -rf "$temp_dir_to_clean"
                fi
                return 1
            fi
        fi
    else
        log "ERROR: No target directory determined for $original_filename"
        # Clean up temp dir if it exists
        if [ -n "$temp_dir_to_clean" ] && [ -d "$temp_dir_to_clean" ]; then
             rm -rf "$temp_dir_to_clean"
        fi
        return 1
    fi

    # Use the transfer_media_file function
    transfer_media_file "$file" "$file_to_process" "$target_dir" "$final_filename"
    local transfer_status=$?

    # --- Cleanup ---
    # Clean up temporary directory from extraction *after* transfer attempt
    if [ -n "$temp_dir_to_clean" ] && [ -d "$temp_dir_to_clean" ]; then
        log "Cleaning up temporary directory: $temp_dir_to_clean"
        rm -rf "$temp_dir_to_clean"
    fi

    if [ $transfer_status -eq 0 ]; then
        log "Successfully processed: $original_filename -> $final_filename"
        
        # Report successful transfer to dashboard
        local file_size=$(stat -c%s "$file_to_process" 2>/dev/null || echo "0")
        log "Updating dashboard with successful transfer: $final_filename"
        dashboard_post_data "$final_filename" "$file_size" "$media_type" "$identified_language" "success" "$target_dir"
        update_media_counts
        
        # If configured to clean up originals after successful transfer
        if [ "$CLEAN_ORIGINAL_FILES" = true ] && [ "$DRY_RUN" = false ]; then
            log "Removing original file: $file"
            rm -f "$file"
            # Remove empty parent directory if possible
            local parent_dir=$(dirname "$file")
            if [ -d "$parent_dir" ] && [ "$parent_dir" != "$SOURCE_DIR" ] && [ -z "$(ls -A "$parent_dir")" ]; then
                # Don't remove the main JDownloader directory - check if it's not directly the SOURCE_DIR
                # or a specifically preserved directory
                if [ "$parent_dir" != "/home/sharvinzlife/Documents/JDownloader" ] && \
                   [ "$parent_dir" != "$SOURCE_DIR" ] && \
                   [ "$(basename "$parent_dir")" != "JDownloader" ]; then
                    log "Removing empty parent directory: $parent_dir"
                    rmdir "$parent_dir"
                else
                    log "Preserving root directory: $parent_dir"
                fi
            fi
        elif [ "$DRY_RUN" = true ]; then
             log "DRY RUN: Would remove original file: $file"
        fi
        return 0
    else
        log "ERROR: Failed to transfer $original_filename to SMB share"
        
        # Report failed transfer to dashboard
        local file_size=$(stat -c%s "$file" 2>/dev/null || echo "0")
        log "Updating dashboard with failed transfer: $original_filename"
        dashboard_post_data "$original_filename" "$file_size" "$media_type" "$identified_language" "failed" "Failed to transfer to $target_dir"
        
        log "KEEPING original file for retry: $file"
        return 1
    fi
}


# --- Main Processing Loop ---
main() {
    log "Starting media monitoring for $SOURCE_DIR"
    
    # Initialize connection status variable
    SMB_CONNECTED=false
    
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

    # Main loop
    while true; do
        # Test/Retry SMB connection
        if [ "$SMB_CONNECTED" = false ]; then
            log "Attempting SMB connection..."
            check_smb_connection
            if [ $? -eq 0 ]; then
                log "SMB connection successful."
                SMB_CONNECTED=true
                # Verify root and subdirs after successful connection
                verify_root_media_dir
                verify_smb_path "$MALAYALAM_MOVIE_PATH"
                verify_smb_path "$MALAYALAM_TV_PATH"
                verify_smb_path "$ENGLISH_MOVIE_PATH"
                verify_smb_path "$ENGLISH_TV_PATH"
            else
                log "WARNING: SMB connection failed. Will retry later."
                SMB_CONNECTED=false
            fi
        fi

        # Process files only if SMB is connected
        if [ "$SMB_CONNECTED" = true ]; then
            log "Scanning $SOURCE_DIR for new media files..."
            # Find files in the source directory and its immediate subdirectories
            find "$SOURCE_DIR" -maxdepth 2 -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" -o -name "*.m4v" -o -name "*.mov" \) -not -path "*/\.*" | while read mediafile; do
                process_media_file "$mediafile"
            done
            log "Scanning complete."

            # Cleanup tasks (only run if SMB is connected, as cleanup might depend on successful transfers)
            log "Starting cleanup operations"
            cleanup_rar_files
            cleanup_empty_dirs
            log "Cleanup operations completed"

        else
            log "SMB not connected, skipping processing and cleanup."
        fi

        log "Sleeping for 60 seconds before next scan..."
        sleep 60
    done
}

# --- Script Entry Point ---
# Create log file if it doesn't exist
touch "$LOG_FILE"

# Start the main process
main