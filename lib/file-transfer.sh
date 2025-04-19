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

# Function to run SMB command with retries
run_smb_command_with_retries() {
    local share="$1"
    local command="$2"
    local max_retries=3
    local retry_count=0
    local output=""
    local status=1

    while [ $retry_count -lt $max_retries ]; do
        output=$(run_smb_command "$share" "$command" 2>&1)
        status=$?

        if [ $status -eq 0 ]; then
            # Command succeeded
            if [ $retry_count -gt 0 ]; then
                log "SMB command succeeded on retry $retry_count"
            fi
            echo "$output"
            return 0
        else
            # Command failed, increment retry count
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log "SMB command failed (status $status), retrying ($retry_count/$max_retries)"
                sleep 2 # Wait before retry
            else
                log "SMB command failed after $max_retries retries, giving up"
            fi
        fi
    done

    # If we reach here, command failed all retries
    return $status
}

# Function to create parent directories recursively with explicit handling for TV show folders
create_parent_directories() {
    local path="$1"
    local parts=()
    local current=""

    # ENHANCED PATH CLEANING - Fix for timestamp contamination
    # First capture the clean path
    if [[ "$path" == *"media/"* ]]; then
        if [[ "$path" =~ (media/[^:]*) ]]; then
            path="${BASH_REMATCH[1]}"
            log "Extracted media path from complex string: $path"
        fi
    fi

    # If still problematic, try to extract manually
    if [[ "$path" == *"DEBUG:"* || "$path" == *"AM "* || "$path" == *"PM "* ]]; then
        log "WARNING: Path still contains timestamps, trying pattern extraction"

        # Try to extract a full TV show path pattern (media/type/show/season)
        if [[ "$path" =~ (media/[^/]+/[^/]+/Season[[:space:]]+[0-9]+) ]]; then
            path="${BASH_REMATCH[1]}"
            log "Extracted TV show path with season: $path"
        elif [[ "$path" =~ (media/[^/]+/[^/]+) ]]; then
            path="${BASH_REMATCH[1]}"
            log "Extracted show-level path: $path"
        elif [[ "$path" =~ (media/[^/]+) ]]; then
            path="${BASH_REMATCH[1]}"
            log "Extracted media-type path: $path"
        else
            log "WARNING: Could not extract clean path, using fallback"
            path="media/transfer-errors"
        fi
    fi

    log "Final cleaned path for directory creation: $path"

    # Special handling for TV show directory structure
    if [[ "$path" == *"tv-shows"* || "$path" == *"malayalam-tv-shows"* ]]; then
        log "TV show path detected, using structured approach to directory creation"

        # Split into components: media type, show name, season
        local media_root=""
        local show_name=""
        local season_dir=""

        if [[ "$path" =~ (media/[^/]+)(/[^/]+)?(/[^/]+)? ]]; then
            media_root="${BASH_REMATCH[1]}"
            if [[ -n "${BASH_REMATCH[2]}" ]]; then
                show_name="${BASH_REMATCH[2]}"
                show_name="${show_name#/}" # Remove leading slash
            fi
            if [[ -n "${BASH_REMATCH[3]}" ]]; then
                season_dir="${BASH_REMATCH[3]}"
                season_dir="${season_dir#/}" # Remove leading slash
            fi

            log "Path components: media_root=$media_root, show_name=$show_name, season_dir=$season_dir"

            # Create each level explicitly
            # 1. First create media root (e.g., media/tv-shows)
            run_smb_command_with_retries "$SMB_SHARE" "cd \"$media_root\"" > /dev/null 2>&1
            if [ $? -ne 0 ]; then
                log "Creating media root directory: $media_root"
                run_smb_command_with_retries "$SMB_SHARE" "mkdir \"$media_root\"" > /dev/null 2>&1
                if [ $? -ne 0 ]; then
                    log "ERROR: Failed to create media root: $media_root"
                    return 1
                fi
            fi

            # 2. Create show directory if defined
            if [[ -n "$show_name" ]]; then
                local show_path="$media_root/$show_name"
                run_smb_command_with_retries "$SMB_SHARE" "cd \"$show_path\"" > /dev/null 2>&1
                if [ $? -ne 0 ]; then
                    log "Creating show directory: $show_path"
                    run_smb_command_with_retries "$SMB_SHARE" "mkdir \"$show_path\"" > /dev/null 2>&1
                    if [ $? -ne 0 ]; then
                        log "ERROR: Failed to create show directory: $show_path"
                        return 1
                    fi
                fi
            fi

            # 3. Create season directory if defined
            if [[ -n "$season_dir" ]]; then
                local season_path="$media_root/$show_name/$season_dir"
                run_smb_command_with_retries "$SMB_SHARE" "cd \"$season_path\"" > /dev/null 2>&1
                if [ $? -ne 0 ]; then
                    log "Creating season directory: $season_path"
                    run_smb_command_with_retries "$SMB_SHARE" "mkdir \"$season_path\"" > /dev/null 2>&1
                    if [ $? -ne 0 ]; then
                        log "ERROR: Failed to create season directory: $season_path"
                        return 1
                    fi
                fi
            fi

            return 0
        fi
    fi

    # For non-TV show paths or if the special handling fails, use the standard approach
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

            # Try to access this directory with retries
            run_smb_command_with_retries "$SMB_SHARE" "cd \"$current\"" > /dev/null 2>&1
            if [ $? -ne 0 ]; then
                log "Creating parent directory: $current"
                # The directory doesn't exist, create it with retries
                run_smb_command_with_retries "$SMB_SHARE" "mkdir \"$current\"" > /dev/null 2>&1
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
    local source_file="$1" # Path to the file to copy (could be original or temp extracted file)
    local target_dir="$2"  # Relative path on SMB share (e.g., media/movies/Movie Title)
    local target_filename="$3" # The final filename to use on the SMB share

    # Clean target directory if it has timestamps or log messages
    # Extract the full path including all subdirectories
    if [[ "$target_dir" == *"media/"* ]]; then
        if [[ "$target_dir" =~ (media/[^:]*) ]]; then
            local clean_target="${BASH_REMATCH[1]}"
            # Check if the extracted path seems valid (has proper structure)
            if [[ "$clean_target" == *"/"* && ${#clean_target} -gt 10 ]]; then
                log "Cleaned target directory from '$target_dir' to '$clean_target'"
                target_dir="$clean_target"
            else
                log "WARNING: Path extraction may have lost subdirectories: $clean_target"
            fi
        fi
    fi

    # If target_dir still has timestamps and includes Season information, try to preserve the full path
    if [[ "$target_dir" == *"DEBUG:"* || "$target_dir" == *"AM "* || "$target_dir" == *"PM "* ]]; then
        log "Target directory still contains timestamps: $target_dir"

        # Try to extract the full path with Season folder
        if [[ "$target_dir" =~ (media/[^[:space:]]+/[^[:space:]]+/Season[[:space:]]+[0-9]+) ]]; then
            target_dir="${BASH_REMATCH[1]}"
            log "Extracted full path with season folder: $target_dir"
        # Try to extract just the series path
        elif [[ "$target_dir" =~ (media/[^[:space:]]+/[^[:space:]]+) ]]; then
            target_dir="${BASH_REMATCH[1]}"
            log "Extracted path with series folder: $target_dir"
        # Fallback to just the media type path
        elif [[ "$target_dir" =~ (media/[^[:space:]]+) ]]; then
            target_dir="${BASH_REMATCH[1]}"
            log "Extracted media type path: $target_dir"
        fi

        # If still problematic, use fallback
        if [[ "$target_dir" == *"DEBUG:"* || "$target_dir" == *"AM "* || "$target_dir" == *"PM "* ]]; then
            target_dir="media/transfer-errors"
            log "Using fallback target directory: $target_dir"
        fi
    fi

    # Minimal final check - ensure no newlines slipped through
    target_filename=$(echo "$target_filename" | tr -d '\n')
    log "[SMB] Using final filename: $target_filename (length: ${#target_filename})"

    # Define the target path properly
    local smb_target_path="//$SMB_SERVER/$SMB_SHARE/$target_dir"

    log "[COPY] Copying $(basename "$source_file") as $target_filename to SMB share: $smb_target_path"

    # Skip if in dry run mode
    if [ "$DRY_RUN" = true ]; then
        log "DRY-RUN: Would copy $(basename "$source_file") to $smb_target_path/$target_filename"
        return 0
    fi

    # Create directory structure using recursive approach
    create_parent_directories "$target_dir"
    if [ $? -ne 0 ]; then
        log "ERROR: Failed to create directory structure: $target_dir"
        return 1
    fi

    # First verify we can access the target directory with retries
    run_smb_command_with_retries "$SMB_SHARE" "cd \"$target_dir\"" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        log "ERROR: Cannot access target directory $target_dir after retries"
        return 1
    fi

    # Check if target file already exists with retries
    run_smb_command_with_retries "$SMB_SHARE" "cd \"$target_dir\"; ls \"$target_filename\"" > /dev/null 2>&1
    local file_exists=$?

    if [ $file_exists -eq 0 ] && [ "$OVERWRITE_EXISTING" != "true" ]; then
        log "Target file already exists and OVERWRITE_EXISTING is disabled. Skipping: $target_filename"
        return 0 # Treat as success for the workflow
    fi

    # Log the exact SMB command being run
    log "[COPY] Running SMB put: smbclient '//$SMB_SERVER/$SMB_SHARE' ... -c 'cd \"$target_dir\"; put \"$source_file\" \"$target_filename\"'"

    # Copy the file using the direct command approach with retries
    run_smb_command_with_retries "$SMB_SHARE" "cd \"$target_dir\"; put \"$source_file\" \"$target_filename\"" > /dev/null 2>&1
    local copy_status=$?

    if [ $copy_status -ne 0 ]; then
        log "ERROR: Failed to copy file: $target_filename (Status: $copy_status)"
        return 1
    fi

    # Verify file exists on target with retries
    local verify_cmd="ls \"$target_dir/$target_filename\""
    log "Verifying file exists: $verify_cmd"
    run_smb_command_with_retries "$SMB_SHARE" "$verify_cmd" > /dev/null 2>&1
    local verify_status=$?

    if [ $verify_status -ne 0 ]; then
        log "ERROR: Verification failed - target file not found after copy: $target_dir/$target_filename"
        return 1
    fi

    log "Successfully copied and verified: $target_filename to $target_dir/"
    return 0
}

# Function to determine target directory based on media type and language
determine_target_directory() {
    local file="$1" # Original file path for context if needed
    local language="$2"
    local media_type="$3"
    local cleaned_name="$4" # Base name after cleaning prefixes and language tags
    local file_extension="${file##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')

    local target_dir=""

    # Debug logging - Redirected to stderr
    log "DEBUG: determine_target_directory called with:" >&2
    log "DEBUG: file=$file" >&2
    log "DEBUG: raw language=$language" >&2
    log "DEBUG: media_type=$media_type" >&2
    log "DEBUG: cleaned_name=$cleaned_name" >&2

    # Extract just the language value without timestamps
    if [[ "$language" == *"malayalam"* ]]; then
        log "DEBUG: Found Malayalam language indicator in language string, setting language to 'malayalam'" >&2
        language="malayalam"
    elif [[ "$language" == *"identify_language:"*"Malayalam"* || "$language" == *"mal"* || "$language" == *"Mal"* || "$language" == *"ML"* || "$language" == *"ml"* ]]; then
        log "DEBUG: Found Malayalam language indicator in complex language string, setting language to 'malayalam'" >&2
        language="malayalam"
    else
        # Strip any timestamps or log messages from language
        if [[ "$language" =~ ([a-zA-Z]+)$ ]]; then
            language="${BASH_REMATCH[1]}"
            log "DEBUG: Extracted language from complex string: $language" >&2
        fi

        log "DEBUG: Malayalam language indicators not found in: $language" >&2
        # Run additional check directly on the file with mediainfo
        if [ -f "$file" ]; then
            if command -v mediainfo >/dev/null 2>&1; then
                local audio_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
                if [[ "$audio_langs" =~ (mal|malayalam|ml) ]]; then
                    log "DEBUG: MediaInfo found Malayalam audio track in file" >&2
                    language="malayalam"
                else
                    # Check audio track titles/descriptions
                    local audio_titles=$(mediainfo --Output='Audio;%Title%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
                    if [[ "$audio_titles" =~ (mal|malayalam|ml) ]]; then
                        log "DEBUG: MediaInfo found Malayalam mentioned in audio track titles" >&2
                        language="malayalam"
                    fi
                fi
            elif command -v ffprobe >/dev/null 2>&1; then
                # Try with ffprobe if mediainfo isn't available
                local ffprobe_langs=$(ffprobe -v error -select_streams a -show_entries stream_tags=language -of compact=p=0:nk=1 "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
                if [[ "$ffprobe_langs" =~ (mal|malayalam|ml) ]]; then
                    log "DEBUG: FFprobe found Malayalam audio track in file" >&2
                    language="malayalam"
                fi
            fi
        fi
    fi

    log "DEBUG: Final detected language for directory logic: $language" >&2
    log "DEBUG: MALAYALAM_TV_PATH=$MALAYALAM_TV_PATH" >&2
    log "DEBUG: ENGLISH_TV_PATH=$ENGLISH_TV_PATH" >&2

    # Video files (movies and TV shows)
    if [[ "$file_extension_lower" =~ ^(mkv|mp4|avi|m4v|mov)$ ]]; then
        if [ "$language" = "malayalam" ]; then
            log "DEBUG: Detected as Malayalam content" >&2
            if [ "$media_type" = "tvshow" ]; then
                log "DEBUG: Detected as TV show, should use MALAYALAM_TV_PATH" >&2
                target_dir="$MALAYALAM_TV_PATH"
                local series_name=$(extract_series_name "$cleaned_name")
                local season_dir=$(get_season_folder "$cleaned_name")
                target_dir="$target_dir/$series_name/$season_dir"
                log "DEBUG: Using directory: $target_dir" >&2
            else # Movie
                log "DEBUG: Detected as movie, using MALAYALAM_MOVIE_PATH" >&2
                target_dir="$MALAYALAM_MOVIE_PATH"
                local movie_folder=$(get_folder_name "$cleaned_name")
                target_dir="$target_dir/$movie_folder"
                log "DEBUG: Using directory: $target_dir" >&2
            fi
        else # English or other
            log "DEBUG: Not detected as Malayalam content, language=$language" >&2
            if [ "$media_type" = "tvshow" ]; then
                log "DEBUG: Detected as TV show, using ENGLISH_TV_PATH" >&2
                target_dir="$ENGLISH_TV_PATH"
                local series_name=$(extract_series_name "$cleaned_name")
                local season_dir=$(get_season_folder "$cleaned_name")
                target_dir="$target_dir/$series_name/$season_dir"
                log "DEBUG: Using directory: $target_dir" >&2
            else # Movie
                log "DEBUG: Detected as movie, using ENGLISH_MOVIE_PATH" >&2
                target_dir="$ENGLISH_MOVIE_PATH"
                local movie_folder=$(get_folder_name "$cleaned_name")
                target_dir="$target_dir/$movie_folder"
                log "DEBUG: Using directory: $target_dir" >&2
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
        log "Unknown file extension: $file_extension_lower, using default directory" >&2
        target_dir="$DEFAULT_MEDIA_PATH/other"
    fi

    # Return only the clean path - make sure we don't return any log messages
    echo "$target_dir"
}

# Function to recursively copy a local folder to SMB share, preserving structure and logging steps
# Usage: copy_folder_to_smb <local_folder> <smb_target_dir>
copy_folder_to_smb() {
    local local_folder="$1"
    local smb_target_dir="$2"

    if [ ! -d "$local_folder" ]; then
        log "ERROR: Local folder does not exist: $local_folder"
        return 1
    fi

    log "Preparing to recursively copy local folder: $local_folder"
    log "Destination SMB path: //$SMB_SERVER/$SMB_SHARE/$smb_target_dir"

    # Find all files (not directories) in the local folder
    find "$local_folder" -type f | while read file; do
        # Compute relative path from local_folder root
        rel_path="${file#$local_folder/}"
        smb_file_dir=$(dirname "$rel_path")
        smb_file_name=$(basename "$file")
        smb_target_path="$smb_target_dir/$smb_file_dir"

        # Log each file transfer
        log "Copying $file to //$SMB_SERVER/$SMB_SHARE/$smb_target_path/$smb_file_name"

        # Ensure target directory exists on SMB
        create_parent_directories "$smb_target_path"
        if [ $? -ne 0 ]; then
            log "ERROR: Could not create directory on SMB: $smb_target_path"
            continue
        fi

        # Use copy_to_smb for the file
        copy_to_smb "$file" "$smb_target_path" "$smb_file_name"
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to copy $file to $smb_target_path/$smb_file_name"
        fi
    done

    log "Completed recursive copy of $local_folder to //$SMB_SERVER/$SMB_SHARE/$smb_target_dir"
    return 0
}

# Function to transfer a processed media file to the SMB share
# Accepts original file path (for logging/cleanup), file to transfer, target dir, and final filename
transfer_media_file() {
    local original_file="$1" # Keep original path for potential cleanup logic
    local file_to_transfer="$2" # This is the file (original or extracted temp) to actually copy
    local target_dir="$3"
    local final_filename="$4" # The name the file should have on the share

    # Skip if in dry run mode
    if [ "$DRY_RUN" = true ]; then
        log "DRY-RUN: Would transfer $(basename "$file_to_transfer") as $final_filename to $target_dir"
        return 0
    fi

    # Copy the file to SMB share with the final filename
    copy_to_smb "$file_to_transfer" "$target_dir" "$final_filename"
    local copy_status=$?

    if [ $copy_status -eq 0 ]; then
        log "Successfully transferred: $final_filename to $target_dir"
        return 0
    else
        log "ERROR: Failed to transfer $final_filename to SMB share"
        return 1
    fi
}
