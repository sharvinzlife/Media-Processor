#!/bin/bash

# Configuration
SOURCE_DIR=/home/sharvinzlife/Documents/JDownloader/
LOG_FILE="/home/sharvinzlife/media-processor.log"
SMB_SERVER=streamwave.local
SMB_SHARE=Data-Streamwave

# SMB credentials - update these with your actual credentials
SMB_USER="sharvinzlife"
SMB_PASSWORD='Tkrw%S$!H2rAPC6x'
SMB_AUTH_METHOD="user"  # Options: user, anonymous
DRY_RUN=false  # Set to true to test without copying or deleting files
OVERWRITE_EXISTING=false  # Set to true to overwrite existing files in destination

# Media paths - corrected from user input
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"
DEFAULT_MEDIA_PATH="media"

# Language extraction settings
EXTRACT_AUDIO_TRACKS=true        # Extract specific language audio tracks
# EXTRACT_SUBTITLES=true           # (Handled within extraction script now)
PREFERRED_LANGUAGE="mal"         # Primary preferred language for extraction target
# PREFERRED_AUDIO_LANGS="mal,eng"  # (Handled within extraction script)
# PREFERRED_SUBTITLE_LANGS="eng"   # (Handled within extraction script)

# Cleanup configuration
CLEANUP_RAR_FILES=true
CLEANUP_EMPTY_DIRS=true
CLEAN_ORIGINAL_FILES=true      # Set to true to delete original files after successful transfer
MIN_RAR_AGE_HOURS=0             # Set to 0 for immediate cleanup after processing

# Create log file if it doesn't exist
touch "$LOG_FILE"
echo "$(date) - Media processor started" >> "$LOG_FILE"

# Import our libraries (NO LONGER SOURCING language-extraction.sh)
LIB_DIR="$(dirname "$0")/lib"
source "$LIB_DIR/logger.sh"
source "$LIB_DIR/file-transfer.sh"
source "$LIB_DIR/config.sh"
source "$LIB_DIR/dashboard-api.sh"
source "$LIB_DIR/media-utils.sh"

# Define path to the language extraction script
LANGUAGE_EXTRACTION_SCRIPT="$LIB_DIR/language-extraction.sh"

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

# Function to clean filenames
clean_filename() {
    local filename="$1"
    
    # Remove common prefixes and references
    local cleaned=$(echo "$filename" | sed -E 's/^www\.[0-9]*TamilMV\.[a-zA-Z]{2,3}\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^TamilMV\s*-\s*//i')
    
    # Remove Sanet.st prefixes - making these patterns more specific
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\.st\.//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\.st\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\s*-\s*//i')
    
    # Remove Softarchive.is prefixes
    cleaned=$(echo "$cleaned" | sed -E 's/^Softarchive\.is\.//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Softarchive\.is\s*-\s*//i')
    
    # Replace underscores with spaces
    cleaned=$(echo "$cleaned" | sed 's/_/ /g')
    
    # Remove curly braces and their content (including any timestamps, dates, or MediaIn)
    cleaned=$(echo "$cleaned" | sed -E 's/\{[^}]*\}//g')
    # Remove any leftover date/time patterns (e.g. Wed Apr 16 ...)
    cleaned=$(echo "$cleaned" | sed -E 's/[A-Z][a-z]{2} [A-Z][a-z]{2} [ 0-9:]+[AP]M [A-Z]{3} [0-9]{4}//g')
    # Remove any 'MediaIn' or similar tags
    cleaned=$(echo "$cleaned" | sed -E 's/MediaIn//g')
    # Remove square brackets with non-standard tags (keep [1080p], [720p], etc.)
    cleaned=$(echo "$cleaned" | sed -E 's/\[[^0-9][^\]]*\]//g')
    
    # Remove repeated extensions (e.g., .mkv.mkv)
    cleaned=$(echo "$cleaned" | sed -E 's/(\.[a-zA-Z0-9]{2,5})+(\.[a-zA-Z0-9]{2,5})$/\2/')
    # Remove duplicate tags and repeated words
    cleaned=$(echo "$cleaned" | awk '{for(i=1;i<=NF;i++){if(!a[$i]++){printf "%s ", $i}}} END{print ""}' | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    # Remove forbidden SMB characters
    cleaned=$(echo "$cleaned" | tr ':*/?"<>|\\' '--------')
    # Remove extra spaces
    cleaned=$(echo "$cleaned" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    # Truncate to 100 chars (before extension)
    local ext=""
    if [[ "$cleaned" =~ (\.[a-zA-Z0-9]{2,5})$ ]]; then
        ext="${BASH_REMATCH[1]}"
        cleaned="${cleaned%$ext}"
        cleaned="${cleaned:0:100}$ext"
    else
        cleaned="${cleaned:0:100}"
    fi
    
    echo "$cleaned"
}

# Function to determine if a file is a TV show or movie
identify_media_type() {
    local filename="$1"
    
    # Check for TV show patterns
    if echo "$filename" | grep -E 'S[0-9]{2}E[0-9]{2}|Season\s?[0-9]{1,2}\s?Episode\s?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}|Ep\s?[0-9]{1,2}' -i > /dev/null; then
        echo "tvshow"
    else
        echo "movie"
    fi
}

# Function to determine if content is Malayalam or English (using mediainfo/filename)
identify_language() {
    local file="$1"
    local detected_language="unknown"
    
    if [ ! -f "$file" ]; then
        log "Identify Language: File not found '$file'"
        echo "$detected_language"
        return 1
    fi
    
    log "Identify Language: Checking '$file'"

    # Check content first (more reliable)
    if command -v mediainfo >/dev/null 2>&1; then
        local audio_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
        log "Identify Language: mediainfo found languages: $audio_langs"
        if [[ "$audio_langs" =~ (mal|malayalam|ml) ]]; then
            detected_language="malayalam"
        elif [[ "$audio_langs" =~ (eng|english) ]]; then
             detected_language="english"
        fi

        # If still unknown, check titles
        if [ "$detected_language" = "unknown" ]; then
            local audio_titles=$(mediainfo --Output='Audio;%Title%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
             if [[ "$audio_titles" =~ (mal|malayalam|ml) ]]; then
                 detected_language="malayalam"
                 log "Identify Language: Found malayalam in audio title"
             elif [[ "$audio_titles" =~ (eng|english) ]]; then
                 detected_language="english"
                 log "Identify Language: Found english in audio title"
             fi
        fi
    fi

    # Check filename if still unknown
    if [ "$detected_language" = "unknown" ]; then
        local filename_lower=$(basename "${file,,}")
        log "Identify Language: Checking filename '$filename_lower'"
        if [[ "$filename_lower" =~ (mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
           [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
            detected_language="malayalam"
        # Broaden english check slightly
        elif [[ "$filename_lower" =~ (eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
             [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
            detected_language="english"
        # Check for South Indian keywords as fallback for malayalam
        elif [[ "$filename_lower" =~ (tamilmv|tamil|southindian) ]]; then
            log "Identify Language: Potential South Indian filename, assuming malayalam"
            detected_language="malayalam"
        fi
    fi

    log "Identify Language: Final detected language: $detected_language"
    echo "$detected_language"
    return 0
}

# Function to clean language tags from filename (used for final name)
clean_language_tags() {
    local filename="$1"
    echo "$filename" | sed -E 's/\[(mal|malayalam|tamil|telugu|hindi|kannada|eng|english)\]//gi' | \
                       sed -E 's/\((mal|malayalam|tamil|telugu|hindi|kannada|eng|english)\)//gi' | \
                       sed -E 's/-+(mal|malayalam|tamil|telugu|hindi|kannada|eng|english)//gi'
}

# Function to extract resolution from media file
extract_resolution() {
    # This function is now replaced by detect_resolution in media-detection.sh
    local file="$1"
    detect_resolution "$file"
}

# Function to extract codec information
extract_codec() {
    # This function is now replaced by detect_codec in media-detection.sh
    local file="$1"
    detect_codec "$file"
}

# Function to get formatted file size
get_formatted_size() {
    # This function is now replaced by get_file_size_formatted in media-detection.sh
    local file="$1"
    get_file_size_formatted "$file"
}

# Function to check if a file has subtitles
check_subtitles() {
    # This function is now replaced by detect_subtitles in media-detection.sh
    local file="$1"
    local subtitle_info=$(detect_subtitles "$file")
    if [[ "$subtitle_info" != "none" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

# Function to get subtitle languages from a file
get_subtitle_languages() {
    # This function is now replaced by detect_subtitles in media-detection.sh
    local file="$1"
    detect_subtitles "$file"
}

# Function to format final filename
format_final_filename() {
    # This function is no longer needed as we use format_filename from media-detection.sh
    local title="$1"
    local media_type="$2"
    local language="$3"
    local has_subtitles="$4"
    local subtitle_langs="$5"
    local quality_tag="$6"
    local file_size="$7"
    local extension="$8"
    
    # Ensure we have the original basename before any additional processing
    echo "$title.$extension"
}

# Main processing function for a media file
process_media_file() {
    local file="$1"
    local filename=$(basename "$file")

    log "Processing file: $filename"

    # Clean base filename
    local base_filename=$(clean_filename "$filename")
    log "Cleaned base filename: $base_filename"

    # Load media detection library
    source "$LIB_DIR/media-detection.sh"

    # Identify language (capture only stdout from function)
    local language=$(detect_language "$file")
    # Log the result AFTER capture (internal function logs steps to stderr)
    log "Language identified by function: $language"

    # Identify media type
    local media_type=$(identify_media_type "$base_filename")
    log "Identified as $media_type: $base_filename"

    # --- Language Extraction Handling --- #
    local file_to_process="$file" # Default to original file
    local extraction_performed=false
    local temp_dir_for_extraction=""

    # Check conditions for attempting extraction
    if [[ "$base_filename" =~ \.(mkv|mp4)$ ]] && [ "$EXTRACT_AUDIO_TRACKS" = true ] && [ "$language" = "malayalam" ]; then
        # Define the target temporary directory and file path
        local base_temp_dir="/tmp/media-processor"
        mkdir -p "$base_temp_dir"
        temp_dir_for_extraction="$base_temp_dir/$(basename "$file" | tr -dc 'a-zA-Z0-9' | tr '[:upper:]' '[:lower:]')_extract_$(date +%s)"
        mkdir -p "$temp_dir_for_extraction"
        local potential_extracted_file="$temp_dir_for_extraction/$(basename "${base_filename%.*}")-mal.mkv"

        log "Attempting language extraction script: $LANGUAGE_EXTRACTION_SCRIPT $file $PREFERRED_LANGUAGE $potential_extracted_file"

        # **CRITICAL: Execute the script, capture stdout (the path) and exit status**
        local extracted_path
        extracted_path=$("$LANGUAGE_EXTRACTION_SCRIPT" "$file" "$PREFERRED_LANGUAGE" "$potential_extracted_file")
        local extraction_status=$?
        log "Extraction script exit status: $extraction_status"
        log "Extraction script stdout (path): $extracted_path"

        # Evaluate the result based ONLY on status and file existence
        if [ $extraction_status -eq 0 ]; then
            # Script finished successfully (might be skipped or extracted)
            # Check if the script produced the expected output file path AND it exists
            if [ -n "$extracted_path" ] && [ "$extracted_path" == "$potential_extracted_file" ] && [ -s "$extracted_path" ]; then
                log "SUCCESS: Extraction script successful and produced valid file: $extracted_path"
                file_to_process="$extracted_path"
                extraction_performed=true
            else
                log "INFO: Extraction script finished (status 0) but did not produce expected output ('$extracted_path' vs '$potential_extracted_file') or file empty/not found. Using original file."
                file_to_process="$file"
                extraction_performed=false
                # Clean up empty temp dir
                if [ -d "$temp_dir_for_extraction" ]; then rmdir "$temp_dir_for_extraction" 2>/dev/null; fi
            fi
        else
            # Script failed (status != 0).
            log "ERROR: Extraction script failed (status $extraction_status). Using original file."
            file_to_process="$file"
            extraction_performed=false
            # Clean up failed temp dir
            if [ -d "$temp_dir_for_extraction" ]; then
                log "Cleaning up failed temporary extraction directory: $temp_dir_for_extraction"
                rm -rf "$temp_dir_for_extraction"
            fi
        fi
    else
      log "INFO: Skipping language extraction (Filetype/Config/Language)."
      file_to_process="$file"
      extraction_performed=false
    fi
    # --- End Language Extraction Handling --- #

    log "File determined for processing: $file_to_process"

    # Final check: ensure the file we intend to process exists
    if [ ! -f "$file_to_process" ]; then
        log "ERROR: Critical - File determined for processing does not exist: '$file_to_process'. Original file was '$file'. Skipping transfer."
        # Cleanup extraction temp dir if it exists
        if [ -n "$temp_dir_for_extraction" ] && [ -d "$temp_dir_for_extraction" ]; then
             log "Cleaning up temporary directory due to non-existent final file: $temp_dir_for_extraction"
             rm -rf "$temp_dir_for_extraction"
        fi
        post_failed_transfer "$file" "Error: Processing resulted in non-existent file" "$language" "$media_type"
        return 1
    fi

    # --- Metadata and Renaming --- #
    # Use original filename for context
    local cleaned_title=$(clean_language_tags "$base_filename")
    log "Cleaned base name (tags removed): $cleaned_title"

    # Determine target directory
    local target_dir=$(determine_target_directory "$file" "$language" "$media_type" "$cleaned_title")
    log "Raw target directory determined: $target_dir"

    # Validate and reconstruct target_dir if necessary
    if [[ -z "$target_dir" || "$target_dir" == *"DEBUG:"* || "$target_dir" == *"AM "* || "$target_dir" == *"PM "* ]]; then
        log "WARNING: Invalid target directory derived ('$target_dir'), reconstructing..."
        if [ "$language" = "malayalam" ] && [ "$media_type" = "tvshow" ]; then
            local series_name=$(extract_series_name "$cleaned_title")
            local season_dir=$(get_season_folder "$cleaned_title")
            target_dir="$MALAYALAM_TV_PATH/$series_name/$season_dir"
        elif [ "$language" = "malayalam" ]; then
            local movie_folder=$(get_folder_name "$cleaned_title")
            target_dir="$MALAYALAM_MOVIE_PATH/$movie_folder"
        elif [ "$media_type" = "tvshow" ]; then
            local series_name=$(extract_series_name "$cleaned_title")
            local season_dir=$(get_season_folder "$cleaned_title")
            target_dir="$ENGLISH_TV_PATH/$series_name/$season_dir"
        else # English Movie
            local movie_folder=$(get_folder_name "$cleaned_title")
            target_dir="$ENGLISH_MOVIE_PATH/$movie_folder"
        fi
        log "Reconstructed target directory: $target_dir"
    fi

    # Format the filename with rich media info using our new function
    local formatted_name=$(format_filename "$file_to_process")
    log "Formatted filename with media info: $formatted_name"
    
    # Get the extension from original file
    local extension="${file_to_process##*.}"
    
    # Determine final filename based on media type
    local final_filename=""
    if [ "$media_type" = "tvshow" ]; then
        # For TV shows, we might need to keep the episode information intact
        # Extract episode info from the original cleaned title
        local episode_info=$(echo "$cleaned_title" | grep -oE 'S[0-9]{2}E[0-9]{2}|Season\s?[0-9]{1,2}\s?Episode\s?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}|Ep\s?[0-9]{1,2}' -i)
        if [ -n "$episode_info" ]; then
            # Use formatted name but ensure episode info is preserved
            final_filename="$formatted_name"
        else
            # Fallback: Use the original formatted name
            final_filename="$formatted_name"
        fi
    else
        # For movies, use the formatted name directly
        final_filename="$formatted_name"
    fi
    
    # Ensure the extension is present
    if [[ ! "$final_filename" =~ \.$extension$ ]]; then
        final_filename="${final_filename}.$extension"
    fi
    
    log "Final filename: $final_filename"
    # --- End Metadata and Renaming --- #

    # --- File Transfer --- #
    if transfer_media_file "$file" "$file_to_process" "$target_dir" "$final_filename"; then
        log "Successfully transferred $filename -> $target_dir/$final_filename"

        # Clean up temp extraction dir if extraction was performed
        if [ "$extraction_performed" = true ] && [ -n "$temp_dir_for_extraction" ] && [ -d "$temp_dir_for_extraction" ]; then
            log "Cleaning up successful temporary extraction directory: $temp_dir_for_extraction"
            rm -rf "$temp_dir_for_extraction"
        fi

        post_to_dashboard "$file" "$target_dir/$final_filename" "$language" "$media_type"

        # --- Original File Cleanup --- #
        if [ "$DRY_RUN" != true ] && [ "$CLEAN_ORIGINAL_FILES" = true ]; then
            log "CLEANUP: Removing original file: $file"
            rm -f "$file"

            # If original file was in a subdirectory (and not the source dir itself), check if empty and remove
            local file_dir=$(dirname "$file")
            if [ "$file_dir" != "." ] && [ "$file_dir" != "/" ] && [ "$file_dir" != "$SOURCE_DIR" ] && [ -d "$file_dir" ] && [ -z "$(ls -A "$file_dir" 2>/dev/null)" ]; then
                log "CLEANUP: Removing empty original directory: $file_dir"
                rmdir "$file_dir"
            fi
        else
            log "KEEPING original file (DRY_RUN=$DRY_RUN, CLEAN_ORIGINAL_FILES=$CLEAN_ORIGINAL_FILES): $file"
        fi
        # --- End Original File Cleanup --- #

        return 0 # Success for this file
    else
        log "ERROR: Failed to transfer $final_filename (from $file_to_process) to SMB share."

        # Clean up temp extraction dir if extraction was performed and transfer failed
        if [ "$extraction_performed" = true ] && [ -n "$temp_dir_for_extraction" ] && [ -d "$temp_dir_for_extraction" ]; then
             log "Cleaning up temporary extraction directory after failed transfer: $temp_dir_for_extraction"
             rm -rf "$temp_dir_for_extraction"
        fi

        post_failed_transfer "$file" "$target_dir/$final_filename" "$language" "$media_type"

        log "KEEPING source file for retry: $file_to_process"
        return 1 # Failure for this file
    fi
    # --- End File Transfer --- #
}

# Function to process directories with media content
process_media_directory() {
    local dir="$1"
    local dirname=$(basename "$dir")
    
    # Skip if not a directory or is the main source directory itself
    if [ ! -d "$dir" ] || [ "$dir" == "$SOURCE_DIR" ]; then
        return
    fi
    
    log "Processing directory: $dirname"
    
    local all_files_processed=true

    # Find media files inside the directory (process them directly)
    find "$dir" -maxdepth 1 -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) | while IFS= read -r mediafile; do
        if is_download_complete "$mediafile"; then
             # Make sure LANGUAGE_EXTRACTION_SCRIPT is executable
             chmod +x "$LANGUAGE_EXTRACTION_SCRIPT"
        process_media_file "$mediafile"
             if [ $? -ne 0 ]; then
                 all_files_processed=false
             fi
        else
            log "Skipping incomplete file: $(basename "$mediafile")"
            all_files_processed=false # Mark dir as not fully processed
        fi
    done

    # Check if directory can be removed (only if CLEAN_ORIGINAL_FILES is true and all contained files were processed)
    if [ "$CLEAN_ORIGINAL_FILES" = true ] && [ "$all_files_processed" = true ] && [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        if [ "$DRY_RUN" = true ]; then
            log "DRY RUN: Would remove empty processed directory: $dir"
        else
            log "Removing empty processed directory: $dir"
        rmdir "$dir"
        fi
    elif [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
         log "Directory is empty but not removing (CLEAN_ORIGINAL_FILES=$CLEAN_ORIGINAL_FILES or all_files_processed=$all_files_processed): $dir"
    fi
}

# Function to cleanup leftover RAR files
cleanup_rar_files() {
    if [ "$CLEANUP_RAR_FILES" != true ]; then
        # log "RAR cleanup disabled, skipping"
        return
    fi
    
    log "Starting cleanup of leftover RAR files"
    
    # Find RAR files (check depth 1 and 2)
    find "$SOURCE_DIR" -maxdepth 2 -type f \( -name "*.rar" -o -name "*.r[0-9][0-9]" -o -name "*.part[0-9]*.rar" \) | sort | while IFS= read -r rar_file; do
        local dir=$(dirname "$rar_file")

        # Check if the directory still contains *any* non-hidden files
        # If it contains other files (like extracted media not yet processed, or other RAR parts), don't delete
        if [ -z "$(find "$dir" -maxdepth 1 -type f -not -name '.*' -not -name "$(basename "$rar_file")" -print -quit)" ]; then
             # Directory is empty except possibly for this RAR file (or other hidden files)
            if [ "$DRY_RUN" = true ]; then
                 log "DRY RUN: Would remove RAR file in likely empty directory: $rar_file"
            else
                 log "Removing RAR file in likely empty directory: $rar_file"
                 rm -f "$rar_file"
            fi
        else
            log "Skipping RAR file (directory not empty): $rar_file"
        fi
    done
    
    log "RAR file cleanup completed"
}

# Function to cleanup empty directories
cleanup_empty_dirs() {
    if [ "$CLEANUP_EMPTY_DIRS" != true ]; then
        # log "Empty directory cleanup disabled, skipping"
        return
    fi
    
    log "Starting cleanup of empty directories"
    
    # Find all directories, excluding the source, sort reverse depth
    find "$SOURCE_DIR" -mindepth 1 -type d -not -path "*/\.*" | sort -r | while IFS= read -r dir; do
        # Check if directory is empty (ignoring hidden files)
        if [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
            if [ "$DRY_RUN" = true ]; then
                log "DRY RUN: Would remove empty directory: $dir"
            else
                log "Removing empty directory: $dir"
                rmdir "$dir"
            fi
        # Optional: Check if directory ONLY contains hidden files?
        # elif [ -z "$(ls -A "$dir" | grep -v '^[.]')" ]; then
             # log "Directory only contains hidden files: $dir"
             # Consider removing if desired
        fi
    done
    
    log "Empty directory cleanup completed"
}

# Main processing loop
main() {
    log "Starting media monitoring for $SOURCE_DIR"
    
    if [ "$DRY_RUN" = true ]; then
        log "Operating mode: DRY RUN - no files will be copied or deleted"
    else
        log "Operating mode: NORMAL"
    fi

    # Ensure extraction script is executable early on
    if [ -f "$LANGUAGE_EXTRACTION_SCRIPT" ]; then
        chmod +x "$LANGUAGE_EXTRACTION_SCRIPT"
        log "Ensured $LANGUAGE_EXTRACTION_SCRIPT is executable."
    else
        log "ERROR: Language extraction script not found at $LANGUAGE_EXTRACTION_SCRIPT"
        exit 1
    fi
    
    # Check required tools first
    check_required_tools
    if [ $? -ne 0 ]; then
        log "ERROR: Required tools are missing. Exiting."
        exit 1
    fi
    
    # Main loop
    while true; do
        log "Scanning $SOURCE_DIR for new media files..."

        # Test SMB connection at the start of each scan cycle
    SMB_CONNECTED=false
            check_smb_connection
            if [ $? -eq 0 ]; then
                SMB_CONNECTED=true
            # Verify directories only if connected
            verify_root_media_dir && \
            verify_smb_path "$MALAYALAM_MOVIE_PATH" && \
            verify_smb_path "$MALAYALAM_TV_PATH" && \
            verify_smb_path "$ENGLISH_MOVIE_PATH" && \
                verify_smb_path "$ENGLISH_TV_PATH"
            if [ $? -ne 0 ]; then
                 log "WARNING: Failed to verify/create SMB directory structure. Transfers might fail."
            fi
        else
            log "WARNING: SMB connection failed. Will attempt processing locally if possible, but transfers will fail."
        fi

        # Process individual files in the root source directory first
        find "$SOURCE_DIR" -maxdepth 1 -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) | while IFS= read -r mediafile; do
             if is_download_complete "$mediafile"; then
                chmod +x "$LANGUAGE_EXTRACTION_SCRIPT"
                process_media_file "$mediafile"
             else
                log "Skipping incomplete file in root: $(basename "$mediafile")"
             fi
        done

        # Process directories within the source directory
        find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -not -path "*/\.*" | while IFS= read -r dir; do
            process_media_directory "$dir"
        done

        log "Scanning complete."
        
        # Cleanup tasks
        log "Starting cleanup operations"
            cleanup_rar_files
            cleanup_empty_dirs
        log "Cleanup operations completed"
        
        log "Sleeping for 60 seconds before next scan..."
        sleep 60
    done
}

# Start the main process if this script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Ensure log file exists and is writable
    touch "$LOG_FILE" || { echo "FATAL: Cannot write to log file $LOG_FILE"; exit 1; }
    main
fi

# Function to post processing information to the dashboard API
post_to_dashboard() {
    local original_file="$1"
    local target_path="$2"
    local language="$3"
    local media_type="$4"
    local filename=$(basename "$target_path")

    # Get file size in bytes
    local file_size=0
    # Use the original file path to get size before potential deletion
    if [ -f "$original_file" ]; then
        file_size=$(stat -c %s "$original_file")
    elif [ -f "$file_to_process" ]; then # Fallback if original is gone but extracted exists
         file_size=$(stat -c %s "$file_to_process")
    fi

    # Call the centralized dashboard API function with success status
    dashboard_post_data "$filename" "$file_size" "$media_type" "$language" "success" "$target_path"

    # Update media counts after successful processing
    update_media_counts

    return 0
}

# Function to post failed transfer information to the dashboard API
post_failed_transfer() {
    local original_file="$1"
    local target_path_or_error="$2"
    local language="$3"
    local media_type="$4"

    if [ -f "$original_file" ]; then
        local filename=$(basename "$original_file")
        local file_size=$(stat -c %s "$original_file")
        dashboard_post_data "$filename" "$file_size" "$media_type" "$language" "failed" "$target_path_or_error"
    else
        log "WARNING: Cannot post failed transfer for non-existent file: $original_file"
    fi
}
