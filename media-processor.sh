#!/bin/bash

# Configuration
SOURCE_DIR=/home/sharvinzlife/Documents/JDownloader/
LOG_FILE="/home/sharvinzlife/media-processor.log"
SMB_SERVER=streamwave.local
SMB_SHARE=Data-Streamwave

# SMB credentials - update these with your actual credentials
SMB_USER="sharvinzlife"
SMB_PASSWORD="i6hyYm43I5!3RzqR"  # Added the provided password
SMB_AUTH_METHOD="anonymous"  # Options: user, anonymous
DRY_RUN=false  # Set to true to test without copying or deleting files

# Media paths
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH=media/malayalam-tv-shows
ENGLISH_MOVIE_PATH=media/movies
ENGLISH_TV_PATH=media/tv-shows

# Cleanup configuration
CLEANUP_RAR_FILES=true
CLEANUP_EMPTY_DIRS=true
MIN_RAR_AGE_HOURS=0          # Set to 0 for immediate cleanup after processing

# Create log file if it doesn't exist
touch $LOG_FILE
echo "$(date) - Media processor started" >> $LOG_FILE

# Function to log messages with timestamp
log() {
    local message="$(date) - $1"
    echo "$message" >> $LOG_FILE
    echo "$message"
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
    
    # Remove extra spaces
    cleaned=$(echo "$cleaned" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
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

# Function to determine if content is Malayalam or English
identify_language() {
    local filename="$1"
    
    if echo "$filename" | grep -i "Malayalam" > /dev/null; then
        echo "malayalam"
    else
        echo "english"
    fi
}

# Extract TV show series name from filename
extract_series_name() {
    local filename="$1"
    
    # Try to extract series name before season/episode designation
    if [[ "$filename" =~ (.*)[sS][0-9]{2}[eE][0-9]{2} ]]; then
        echo "${BASH_REMATCH[1]}" | sed -E 's/\.[^.]*$//; s/\s*$//'
    elif [[ "$filename" =~ (.*)[sS]eason[[:space:]]*[0-9]+ ]]; then
        echo "${BASH_REMATCH[1]}" | sed -E 's/\.[^.]*$//; s/\s*$//'
    else
        # If no clear pattern, use first part of filename before first dot
        echo "$filename" | sed -E 's/\.[^.]*(\.[^.]*)?$//'
    fi
}

# Function to get folder name from filename (without extension)
get_folder_name() {
    local filename="$1"
    echo "${filename%.*}"
}

# Function to run SMB command with authentication
run_smb_command() {
    local share="$1"
    local command="$2"
    local output_file=$(mktemp)
    local status=0
    
    if [[ "$SMB_AUTH_METHOD" == "anonymous" ]]; then
        # Try anonymous connection first
        log "Trying anonymous connection"
        smbclient "//$SMB_SERVER/$share" -N -c "$command" 2>&1 | tee "$output_file"
        status=${PIPESTATUS[0]}
    else
        if [ -n "$SMB_PASSWORD" ]; then
            # If password is provided in script
            log "Connecting with username: $SMB_USER"
            smbclient "//$SMB_SERVER/$share" -U "$SMB_USER%$SMB_PASSWORD" -c "$command" 2>&1 | tee "$output_file"
            status=${PIPESTATUS[0]}
        else
            # Use stored credentials if available or prompt for password
            smbclient "//$SMB_SERVER/$share" -U "$SMB_USER" -c "$command" 2>&1 | tee "$output_file"
            status=${PIPESTATUS[0]}
        fi
    fi
    
    # Check for common error messages in the output
    local error_output=$(cat "$output_file")
    if echo "$error_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND" > /dev/null; then
        log "ERROR: Access denied or path not found in command: $command"
        log "Error details: $(echo "$error_output" | grep -E "NT_STATUS_ACCESS_DENIED|NT_STATUS_OBJECT_NAME_NOT_FOUND")"
        status=1
    fi
    
    rm "$output_file"
    return $status
}

# Function to test SMB connection
test_smb_connection() {
    log "Testing SMB connection to $SMB_SERVER"
    
    if [[ "$SMB_AUTH_METHOD" == "anonymous" ]]; then
        # Try anonymous connection
        log "Testing anonymous connection"
        smbclient -L $SMB_SERVER -N 2>&1 | tee -a $LOG_FILE
    else 
        if [ -n "$SMB_PASSWORD" ]; then
            # If password is provided in script
            log "Testing with username: $SMB_USER"
            smbclient -L $SMB_SERVER -U "$SMB_USER%$SMB_PASSWORD" 2>&1 | tee -a $LOG_FILE
        else
            # Use stored credentials if available or prompt for password
            smbclient -L $SMB_SERVER -U "$SMB_USER" 2>&1 | tee -a $LOG_FILE
        fi
    fi
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log "ERROR: Failed to connect to SMB server $SMB_SERVER. Check if the server is reachable."
        return 1
    fi
    
    log "Verifying share exists: $SMB_SHARE"
    run_smb_command "$SMB_SHARE" "ls" > /dev/null
    
    if [ $? -ne 0 ]; then
        log "ERROR: $SMB_SHARE share does not exist or cannot be accessed. Available shares:"
        if [[ "$SMB_AUTH_METHOD" == "anonymous" ]]; then
            smbclient -L $SMB_SERVER -N | grep "Disk" | awk '{print $1}' | tee -a $LOG_FILE
        else
            smbclient -L $SMB_SERVER -U "$SMB_USER" | grep "Disk" | awk '{print $1}' | tee -a $LOG_FILE
        fi
        return 1
    fi
    
    return 0
}

# Function to create a directory and confirm it was created
create_smb_directory() {
    local path="$1"
    local full_path="$path"
    
    log "Creating directory: $full_path"
    
    # Use mkdir -p equivalent for SMB
    create_parent_directories "$path"
    
    # Final attempt to create the specified directory
    run_smb_command "$SMB_SHARE" "mkdir \"$path\"" > /dev/null
    local mkdir_status=$?
    
    # Verify directory was created
    if [ $mkdir_status -ne 0 ]; then
        log "Warning: Could not create directory $path"
        # Try to cd into directory to see if it already exists
        run_smb_command "$SMB_SHARE" "cd \"$path\"" > /dev/null
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to access directory $path"
            return 1
        else
            log "Directory $path already exists, continuing."
        fi
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
                fi
            fi
        fi
    done
}

# Function to verify SMB path exists
verify_smb_path() {
    local path="$1"
    
    log "Verifying path exists: $path"
    run_smb_command "$SMB_SHARE" "cd \"$path\"" > /dev/null
    
    if [ $? -ne 0 ]; then
        log "WARNING: '$path' directory may not exist in $SMB_SHARE share"
        
        # Try to create the path
        return $(create_smb_directory "$path")
    fi
    
    return 0
}

# Function for copying a file to SMB and verifying it worked
copy_file_to_smb() {
    local source_file="$1"
    local target_path="$2"
    local target_filename="$3"
    
    log "Copying $source_file to //$SMB_SERVER/$SMB_SHARE/$target_path/$target_filename"
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would copy $source_file to //$SMB_SERVER/$SMB_SHARE/$target_path/$target_filename"
        return 0
    fi
    
    # First verify we can access the target directory
    run_smb_command "$SMB_SHARE" "cd \"$target_path\"" > /dev/null
    if [ $? -ne 0 ]; then
        log "ERROR: Cannot access target directory $target_path"
        return 1
    fi
    
    # Copy the file
    run_smb_command "$SMB_SHARE" "cd \"$target_path\"; put \"$source_file\" \"$target_filename\"" > /dev/null
    local copy_status=$?
    
    # Verify the file was copied successfully
    if [ $copy_status -eq 0 ]; then
        # Check that the file exists in the destination
        run_smb_command "$SMB_SHARE" "cd \"$target_path\"; ls \"$target_filename\"" > /dev/null
        if [ $? -eq 0 ]; then
            log "File verified in destination: $target_path/$target_filename"
            return 0
        else
            log "ERROR: File not found in destination after copy: $target_path/$target_filename"
            return 1
        fi
    else
        log "ERROR: Failed to copy file, status: $copy_status"
        return 1
    fi
}

# Function to process media files
process_media_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    # Skip if file is still being downloaded
    if [[ "$filename" == .* ]] || [[ "$filename" == *.part ]] || [[ "$filename" == *.downloading ]]; then
        log "Skipping temporary file: $filename"
        return
    fi
    
    # Check if it's a media file
    if ! echo "$filename" | grep -E '\.(mkv|mp4|avi)$' -i > /dev/null; then
        log "Skipping non-media file: $filename"
        return
    fi
    
    # Get file size
    filesize=$(du -k "$file" 2>/dev/null | cut -f1)
    
    # Skip if file size is less than 10MB (likely incomplete)
    if [ ${filesize:-0} -lt 10000 ]; then
        log "Skipping small file (likely incomplete): $filename ($filesize KB)"
        return
    fi
    
    log "Processing file: $filename"
    
    # Clean filename
    clean_name=$(clean_filename "$filename")
    
    # Log the before and after separately
    log "Original filename: $filename"
    log "Cleaned filename: $clean_name"
    
    # Determine language (Malayalam or English)
    language=$(identify_language "$filename")
    log "Identified language: $language"
    
    # Determine if it's a TV show or movie
    media_type=$(identify_media_type "$filename")
    log "Identified as $media_type: $clean_name"
    
    # Set target path based on language and media type
    if [[ "$language" == "malayalam" ]]; then
        if [[ "$media_type" == "movie" ]]; then
            target_path="$MALAYALAM_MOVIE_PATH"
        else
            target_path="$MALAYALAM_TV_PATH"
        fi
    else
        if [[ "$media_type" == "movie" ]]; then
            target_path="$ENGLISH_MOVIE_PATH"
        else
            target_path="$ENGLISH_TV_PATH"
        fi
    fi
    
    # Verify the target path exists
    verify_smb_path "$target_path"
    if [ $? -ne 0 ]; then
        log "ERROR: Target path verification failed for $target_path"
        return
    fi
    
    # Create appropriate folder structure
    if [[ "$media_type" == "movie" ]]; then
        # For movies, use movie name as folder
        folder_name=$(get_folder_name "$clean_name")
        log "Creating movie folder: $folder_name"
    else
        # For TV shows, extract series name for main folder
        series_name=$(extract_series_name "$clean_name")
        log "Extracted series name: $series_name"
        folder_name="$series_name"
    fi
    
    # Full target path with folder
    full_target_path="$target_path/$folder_name"
    
    # Create directory for the file
    create_smb_directory "$full_target_path"
    if [ $? -ne 0 ]; then
        log "ERROR: Failed to create directory structure for $full_target_path"
        return
    fi
    
    # Create a temporary file with cleaned name if needed
    if [ "$clean_name" != "$filename" ]; then
        log "Creating temp file with cleaned name"
        # Get file extension
        temp_dir="/tmp"
        temp_file="$temp_dir/$clean_name"
        
        # Copy the original file to the temp location with cleaned name
        cp "$file" "$temp_file"
        
        # Copy file to SMB share into the new folder with the cleaned name
        copy_file_to_smb "$temp_file" "$full_target_path" "$clean_name"
        copy_status=$?
        
        # Remove temporary file
        rm "$temp_file"
    else
        # Copy file directly if no cleaning was needed
        copy_file_to_smb "$file" "$full_target_path" "$clean_name"
        copy_status=$?
    fi
    
    if [ $copy_status -eq 0 ]; then
        log "SUCCESS: Copied '$clean_name' to //$SMB_SERVER/$SMB_SHARE/$full_target_path"
        
        if [ "$DRY_RUN" = true ]; then
            log "DRY RUN: Would remove original file: $file"
        else
            log "Removing original file: $file"
            rm "$file"
        fi
    else
        log "ERROR: Failed to copy file to //$SMB_SERVER/$SMB_SHARE/$full_target_path, status: $copy_status"
        log "KEEPING original file for retry: $file"
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

# Function to check if a file is completely downloaded (not being modified)
is_download_complete() {
    local file="$1"
    local size1=$(stat -c %s "$file" 2>/dev/null)
    
    # If file doesn't exist or can't get size, it's not ready
    if [[ -z "$size1" ]]; then
        return 1
    fi
    
    # Wait 10 seconds
    sleep 10
    
    # Check size again
    local size2=$(stat -c %s "$file" 2>/dev/null)
    
    # If file no longer exists, it was probably moved
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # If sizes are the same and not zero, download is likely complete
    if [[ ! -z "$size2" ]] && [[ "$size1" == "$size2" ]] && [[ "$size1" -gt 0 ]]; then
        return 0
    else
        return 1
    fi
}

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
cleanup_empty_directories() {
    if [ "$CLEANUP_EMPTY_DIRS" != true ]; then
        log "Empty directory cleanup disabled, skipping"
        return
    fi
    
    log "Starting cleanup of empty directories"
    
    # Find all directories in the source directory
    find "$SOURCE_DIR" -type d -not -path "$SOURCE_DIR" -not -path "$SOURCE_DIR/Media extractor" | sort -r | while read dir; do
        # Check if directory is empty
        if [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
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

# Main monitoring loop
main() {
    log "Starting media monitoring for $SOURCE_DIR"
    log "Operating mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN (no files will be modified)" || echo "NORMAL")"
    
    # Check if smbclient is installed
    if ! command -v smbclient &> /dev/null; then
        log "ERROR: smbclient is not installed. Please install it with 'sudo apt-get install smbclient'"
        exit 1
    fi
    
    # Test SMB connection
    test_smb_connection
    if [ $? -ne 0 ]; then
        log "ERROR: Initial SMB connection test failed. Retrying in 60 seconds..."
        sleep 60
        test_smb_connection
        if [ $? -ne 0 ]; then
            log "ERROR: SMB connection failed after retry. Exiting."
            exit 1
        fi
    fi
    
    # Verify media subdirectories exist
    log "Verifying media directories exist"
    verify_smb_path "$MALAYALAM_MOVIE_PATH"
    verify_smb_path "$MALAYALAM_TV_PATH"
    verify_smb_path "$ENGLISH_MOVIE_PATH"
    verify_smb_path "$ENGLISH_TV_PATH"
    
    while true; do
        log "Scanning for new content..."
        
        # First process any media files directly in the source directory
        find "$SOURCE_DIR" -maxdepth 1 -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) -not -path "*/\.*" | while read file; do
            if is_download_complete "$file"; then
                process_media_file "$file"
            fi
        done
        
        # Then process any media directories
        find "$SOURCE_DIR" -maxdepth 1 -type d -not -path "$SOURCE_DIR" -not -path "*/\.*" | while read dir; do
            log "Found directory: $dir"
            
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
        done
        
        # Run cleanup processes
        cleanup_rar_files
        cleanup_empty_directories
        
        # Sleep before next check
        log "Sleeping for 60 seconds before next scan..."
        sleep 60
    done
}

# Start the main process
main

