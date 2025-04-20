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

# Source the configuration and utilities (assuming they set environment variables)
# If config.sh/utils.sh define functions needed here, they MUST be sourced.
# Let's assume they are needed for now.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh" # For PROCESSED_DIR, LOG_FILE etc.
source "$SCRIPT_DIR/utils.sh"   # For check_required_tools if needed

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

# Clean language tags from filename - DECLARE EARLY
clean_language_tags() {
    local filename="$1"
    local original="$filename"  # Keep original for reference
    local cleaned=$(echo "$filename" | sed -E 's/\[(mal|malayalam|tamil|telugu|hindi|kannada)\]//gi' | \
                       sed -E 's/\((mal|malayalam|tamil|telugu|hindi|kannada)\)//gi' | \
                       sed -E 's/-+(mal|malayalam|tamil|telugu|hindi|kannada)//gi')
    
    # Fix truncation issues with common show names - add more as needed
    # More comprehensive check for White Lotus variations
    if [[ "$cleaned" =~ [Ww]hite[[:space:]]*[Ll]otu ]]; then
        cleaned=$(echo "$cleaned" | sed -E 's/([Ww]hite[[:space:]]*[Ll])otu([^s]|$)/\1otus\2/g')
        log_lib "Fixed truncated show name: White Lotu → White Lotus"
    fi
    
    # Also fix other common truncation issues
    if [[ "$cleaned" =~ Arrival[[:space:]] && "$original" =~ Arrivals ]]; then
        cleaned=$(echo "$cleaned" | sed -E 's/Arrival([[:space:]])/Arrivals\1/g')
        log_lib "Fixed truncated word: Arrival → Arrivals"
    fi
    
    # General truncation detection - compare string length drops 
    if [[ ${#original} -gt $((${#cleaned} + 15)) ]]; then
        log_lib "Warning: Significant truncation detected (${#original} → ${#cleaned} chars)"
        log_lib "Original: $original"
        log_lib "Cleaned: $cleaned"
    fi
    
    echo "$cleaned"
}

# Extract language tracks using mediainfo - DECLARE EARLY
extract_language_tracks_mediainfo() {
    local input_file="$1"
    mediainfo --Output="Audio;%Language/String%\n" "$input_file" 2>/dev/null | sort -u
}

# Function to identify language from filename and content
identify_language() {
    local filename="$1"
    local filename_lower="${filename,,}"  # Convert to lowercase
    local identified_lang="unknown" # Default

    log_lib "Identifying language for: $(basename "$filename")"
    if [ -f "$filename" ]; then
        local audio_langs
        audio_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$filename" 2>/dev/null | tr '[:upper:]' '[:lower:]')
        log_lib "Audio languages found: $audio_langs"
        if [[ "$audio_langs" =~ (mal|malayalam|ml) ]]; then
            log_lib "Malayalam audio track detected"
            identified_lang="malayalam"
        elif [[ "$audio_langs" =~ (eng|english) ]]; then
            log_lib "English audio track detected"
            identified_lang="english"
        fi
        if [ "$identified_lang" = "unknown" ]; then
            local audio_titles
            audio_titles=$(mediainfo --Output='Audio;%Title%\n' "$filename" 2>/dev/null | tr '[:upper:]' '[:lower:]')
            if [[ "$audio_titles" =~ (mal|malayalam|ml) ]]; then
                log_lib "Malayalam mentioned in audio track titles"
                identified_lang="malayalam"
            elif [[ "$audio_titles" =~ (eng|english) ]]; then
                log_lib "English mentioned in audio track titles"
                identified_lang="english"
            fi
        fi
    fi
    if [ "$identified_lang" = "unknown" ]; then
        # Enhanced pattern matching for Malayalam indicators in filename
        if [[ "$filename_lower" =~ (mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
           [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
           [[ "$filename_lower" =~ \bm(al)?\b ]]; then
            log_lib "Malayalam detected in filename"
            identified_lang="malayalam"
        elif [[ "$filename_lower" =~ (eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
             [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
             [[ "$filename_lower" =~ \be(ng)?\b ]]; then
            log_lib "English detected in filename"
            identified_lang="english"
        fi
    fi
    
    if [ "$identified_lang" = "unknown" ]; then
        if [[ "$filename_lower" =~ (tamilmv|tamil|southindian) ]]; then
            log_lib "Potential South Indian content detected, assuming malayalam for extraction purposes"
            identified_lang="malayalam"
        fi
    fi
    if [ "$identified_lang" = "unknown" ] && [ -f "$filename" ]; then
        # Last resort - if we have audio tracks and none are identified as Malayalam,
        # assume English for media files with audio
        local has_audio=$(mediainfo --Output='Audio;%Language/String%\n' "$filename" 2>/dev/null)
        if [ -n "$has_audio" ]; then
            log_lib "Audio tracks found but no language identified, assuming english"
            identified_lang="english"
        else
            log_lib "No specific language identified, defaulting to 'unknown'"
        fi
    elif [ "$identified_lang" = "unknown" ]; then
        log_lib "No specific language identified, defaulting to 'unknown'"
    fi
    echo "$identified_lang"
    return 0
}

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

# Find Malayalam audio track with enhanced detection
find_malayalam_track() {
    local input_file="$1"
    local audio_tracks="$2"
    local malayalam_track=""
    
    log_lib "Searching for Malayalam audio track..."
    
    # Get full track info for better language detection
    local track_info
    track_info=$(mediainfo --Output="Audio;%ID%:%Language%:%Title%\n" "$input_file")
    
    # First try: Look for explicit Malayalam language tag
    while IFS=: read -r id lang title; do
        if [[ -n "$id" && ("$lang" =~ ^(mal|ml)$ || "$title" =~ (malayalam|mal|ml)) ]]; then
            malayalam_track="$id"
            log_lib "Found Malayalam audio track by language/title: $malayalam_track"
            echo "$malayalam_track"
            return 0
        fi
    done <<< "$track_info"
    
    # Second try: Check track 5 (common pattern in South Indian content)
    if echo "$audio_tracks" | grep -q "^5$"; then
        malayalam_track="5"
        log_lib "Using track 5 as Malayalam track (common pattern)"
        echo "$malayalam_track"
        return 0
    fi
    
    # Third try: Check track 4 (alternate common pattern)
    if echo "$audio_tracks" | grep -q "^4$"; then
        malayalam_track="4"
        log_lib "Using track 4 as Malayalam track (alternate pattern)"
        echo "$malayalam_track"
        return 0
    fi
    
    log_lib "No Malayalam audio track found"
    return 1
}

# Find English subtitle track
find_english_subtitle() {
    local input_file="$1"
    log_lib "Searching for English subtitle track..."
    
    local subtitle_info
    subtitle_info=$(mediainfo --Output="Text;%ID%:%Language%:%Title%\n" "$input_file" | grep -v "^::")
    log_lib "Found subtitle tracks: $subtitle_info"
    
    local eng_track
    eng_track=$(echo "$subtitle_info" | grep -i ":en\(g\)\?:" | cut -d: -f1 | head -1)
    
    if [ -n "$eng_track" ]; then
        log_lib "Found English subtitle track: $eng_track"
        echo "$eng_track"
        return 0
    fi
    
    log_lib "No English subtitle track found"
    return 1
}

# Verify output file
verify_output() {
    local output_file="$1"
    
    if [ ! -f "$output_file" ] || [ ! -s "$output_file" ]; then
        log_lib "Output file not created or empty"
        return 1
    fi
    
    local out_lang
    out_lang=$(mediainfo --Output="Audio;Language=%Language%" "$output_file")
    log_lib "Output file audio language: $out_lang"
    
    return 0
}

# Ensure processed directory exists with proper permissions
ensure_processed_dir() {
    if [ ! -d "$PROCESSED_DIR" ]; then
        log_lib "Creating processed directory: $PROCESSED_DIR"
        if ! mkdir -p "$PROCESSED_DIR"; then
            log_lib "Failed to create processed directory"
            return 1
        fi
        # Set ownership to current user since it's in user's home directory
        if ! chmod 755 "$PROCESSED_DIR"; then
            log_lib "Failed to set mode on processed directory"
            return 1
        fi
    fi
    return 0
}

# Extracts MKV tracks. Outputs the final file path to STDOUT on success.
extract_mkv_tracks() {
    local input_file="$1"
    local output_file="$2"
    local language_code="$3" # Expecting 'mal' or 'malayalam'

    if [ -z "$input_file" ] || [ -z "$output_file" ]; then
        log_lib "ERROR: Input or output file path missing in extract_mkv_tracks"
        return 1
    fi

    log_lib "Starting extraction for: $(basename "$input_file") -> $(basename "$output_file")"

    # Ensure output directory exists
    local output_dir=$(dirname "$output_file")
    if [ ! -d "$output_dir" ]; then
        log_lib "Creating output directory: $output_dir"
        mkdir -p "$output_dir"
        if [ $? -ne 0 ]; then
            log_lib "ERROR: Failed to create output directory: $output_dir"
            return 1
        fi
        chmod 755 "$output_dir" # Ensure permissions
    fi

    # Show all tracks in file for debugging
    log_lib "All tracks in file:"
    mediainfo "$input_file" | grep -E "^(Audio|Text)" | grep -E "Track |ID |Language" | while IFS= read -r line; do
        log_lib "  $line"
    done

    # Find Malayalam audio track ID
    local audio_tracks=$(mediainfo "$input_file" | grep -A 10 "Audio" | grep -E "ID.*: ([0-9]+)" | sed -E 's/.*ID.*: ([0-9]+).*/\1/')
    log_lib "Available audio tracks: $audio_tracks"
    local malayalam_track=""

    # Loop through each audio track to find Malayalam
    for track in $audio_tracks; do
        local lang=$(mediainfo "$input_file" | grep -A 20 "Audio #$track" | grep -i "Language" | grep -i -E "Malayalam|Mal|ML|mal|ml|^m$|^M$")
        if [[ -n "$lang" ]]; then
            malayalam_track=$track
            log_lib "Found Malayalam audio track: $malayalam_track"
            break
        fi
        
        # Also check track title for Malayalam indicators
        local title=$(mediainfo "$input_file" | grep -A 20 "Audio #$track" | grep -i "Title" | grep -i -E "Malayalam|Mal|ML|mal|ml")
        if [[ -n "$title" ]]; then
            malayalam_track=$track
            log_lib "Found Malayalam audio track via title: $malayalam_track"
            break
        fi
    done

    # If no Malayalam track found by language, use track 5 (common in South Indian content)
    if [[ -z "$malayalam_track" ]]; then
        malayalam_track="5"
        log_lib "No Malayalam track detected by language, using track 5"
    fi

    # Find English subtitle track
    local subtitle_tracks=$(mediainfo "$input_file" | grep -A 10 "Text" | grep -E "ID.*: ([0-9]+)" | sed -E 's/.*ID.*: ([0-9]+).*/\1/')
    local english_subtitle=""

    # Loop through each subtitle track to find English
    for track in $subtitle_tracks; do
        local lang=$(mediainfo "$input_file" | grep -A 20 "Text #$track" | grep -i "Language" | grep -i "English")
        if [[ -n "$lang" ]]; then
            english_subtitle=$track
            log_lib "Found English subtitle track: $english_subtitle"
            break
        fi
    done

    # Prepare mkvmerge command
    local subtitle_option=""
    if [[ -n "$english_subtitle" ]]; then
        subtitle_option="--subtitle-tracks $english_subtitle"
    else
        subtitle_option="--no-subtitles"
    fi

    log_lib "Running mkvmerge extraction with Malayalam audio (track $malayalam_track): $(basename "$input_file")"
    mkvmerge -o "$output_file" \
        --audio-tracks "$malayalam_track" \
        $subtitle_option \
        "$input_file"
    local mkvmerge_status=$?

    if [ $mkvmerge_status -ne 0 ]; then
        log_lib "mkvmerge extraction failed with status: $mkvmerge_status"
        [ -f "$output_file" ] && rm -f "$output_file"
        return 1
    fi

    if [ ! -s "$output_file" ]; then
        log_lib "Output file not created or empty: $output_file"
        return 1
    fi

    # Verify the language of the audio track in the output file
    local out_lang=$(mediainfo "$output_file" | grep -A 20 "Audio" | grep -i "Language" | head -1)
    log_lib "Output file audio language: $out_lang"

    log_lib "Extraction completed successfully to: $output_file"
    # **CRITICAL: Output path to STDOUT only on success - must have the unique marker**
    # Use a very clear marker that the main script can look for
    echo "EXTRACTION_OUTPUT_PATH_MARKER:$output_file"
    return 0
}

# Main processing logic when run as script
process_language_extraction_main() {
    local input_file="$1"
    local identified_language="$2" # Should be 'mal' or similar
    local target_output_file="$3"

    # Validate arguments
    if [ -z "$input_file" ] || [ -z "$identified_language" ] || [ -z "$target_output_file" ]; then
        log_lib "ERROR: Missing arguments. Usage: $0 <input_file> <language_code> <target_output_file>"
        exit 1 # Indicate failure
    fi

    log_lib "===== Standalone Extraction Script START ====="
    log_lib "Input file: $input_file"
    log_lib "Language code: $identified_language" # Assume this is passed correctly now
    log_lib "Target output file: $target_output_file"

    local file_extension="${input_file##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')

    # Check if extraction should be performed
    # Support all possible formats of Malayalam language codes: Mal, mal, ML, ml, m, M, Malayalam, malayalam
    if [[ "$file_extension_lower" =~ ^(mkv|mp4)$ ]] && [ "$EXTRACT_AUDIO_TRACKS" = true ] && \
       [[ "${identified_language,,}" =~ ^(mal|malayalam|ml|m)$ ]]; then
        # Normalize language code to "mal" for internal processing
        identified_language="mal"
        log_lib "Normalized language code to 'mal' for processing"
        
        # Ensure target directory exists
        local target_dir=$(dirname "$target_output_file")
        if [ ! -d "$target_dir" ]; then
            log_lib "Creating target directory for extraction: $target_dir"
            mkdir -p "$target_dir"
            if [ $? -ne 0 ]; then
                log_lib "ERROR: Failed to create target directory: $target_dir"
                exit 1 # Failure
            fi
        fi

        # Execute the core extraction function
        extract_mkv_tracks "$input_file" "$target_output_file" "$identified_language"
        local extract_status=$?

        log_lib "Core extraction status: $extract_status"

        if [ $extract_status -eq 0 ]; then
            # Success: extract_mkv_tracks already printed path to stdout
            log_lib "Extraction script finished successfully."
            exit 0 # Success
        else
            log_lib "ERROR: Core extraction failed with status $extract_status."
            exit 1 # Failure
        fi
    else
        log_lib "Skipping extraction based on filetype/config/language."
        # Return the original input file when skipping extraction
        # Use the same marker for consistent handling by the main script
        echo "EXTRACTION_OUTPUT_PATH_MARKER:$input_file"
        exit 0
    fi
}

# --- Script Entry Point --- #
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check required tools if run directly
    # check_required_tools || exit 1

    # Execute the main logic with command-line arguments
    process_language_extraction_main "$1" "$2" "$3"
fi
