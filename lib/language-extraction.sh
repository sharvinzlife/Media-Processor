#!/bin/bash
#
# Media Processor - Language Extraction Module
# Focused on Malayalam language extraction from media files
# Can be run as a standalone script.
#
# Usage: ./language-extraction.sh <input_file> <language_code> <target_output_file>
#
# On success: Prints the full path of the extracted file to STDOUT and exits 0.
# On failure or skip: Prints nothing to STDOUT and exits 1 (failure) or 0 (skipped).

# Source required libraries
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"
source "$SCRIPT_DIR/core-utils.sh"

# Internal logging function for this script (writes to stderr)
log_lib() {
    # Use LOG_FILE defined in config.sh if available, otherwise fallback
    local logfile="${LOG_FILE:-/tmp/language-extraction.log}"
    echo "$(date +'%a %b %d %I:%M:%S %p %Z %Y') - [Extractor] $*" >> "$logfile"
    # Also print to stderr for visibility if not run via service
    echo "$(date +'%a %b %d %I:%M:%S %p %Z %Y') - [Extractor] $*" >&2
}

# Define processed directory relative to JDownloader path if not set by config
JDOWNLOADER_DIR="${JDOWNLOADER_DIR:-/home/sharvinzlife/Documents/JDownloader}"
PROCESSED_DIR="${PROCESSED_DIR:-$JDOWNLOADER_DIR/processed}"
EXTRACT_AUDIO_TRACKS=${EXTRACT_AUDIO_TRACKS:-true} # Default if not set

# Check for required tools
check_requirements() {
    local missing_tools=()
    
    for tool in mediainfo mkvmerge; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_lib "ERROR: Required tools not found: ${missing_tools[*]}"
        return 1
    fi
    
    return 0
}

# Get audio track information with detailed logging
get_audio_tracks() {
    local input_file="$1"
    log_lib "Getting audio tracks for: $(basename "$input_file")"
    
    # Get track IDs and languages in a clean format
    local track_info
    track_info=$(mediainfo --Output="Audio;%ID%:%Language%:%Title%\n" "$input_file" | grep -v "^::")
    log_lib "Audio track info:"
    echo "$track_info" | while IFS= read -r line; do
        log_lib "  $line"
    done
    
    # Extract just the track IDs
    local track_ids
    track_ids=$(echo "$track_info" | cut -d: -f1)
    log_lib "Found audio track IDs: $track_ids"
    echo "$track_ids"
}

# Main processor function
process_media_file() {
    local input_file="$1"
    local output_file="$2"
    local language_code="$3"

    # Use unified language detection
    local detected_lang=$(detect_language "$input_file")
    log_lib "Detected language: $detected_lang"
    
    # Process based on detected language
    if [ "$detected_lang" = "malayalam" ]; then
        extract_mkv_tracks "$input_file" "$output_file" "mal"
    else
        log_lib "Not a Malayalam file, skipping extraction"
        echo "EXTRACTION_OUTPUT_PATH_MARKER:$input_file"
    fi

    return 0
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check required tools first
    check_requirements || exit 1
    # Process command line arguments
    process_media_file "$1" "$2" "$3"
fi
