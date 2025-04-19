#!/bin/bash
#
# Media Processor - Media Detection Module
# This file contains functions for media type detection and metadata extraction
#

# Source the configuration and utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"
# Source language extraction only for clean_language_tags if needed
source "$SCRIPT_DIR/language-extraction.sh" # Needed for clean_language_tags

# Function to aggressively strip all known metadata tags from the base name
# Takes the base name (without extension) as input
strip_metadata_from_basename() {
    local base_name="$1"

    # Patterns to remove (adjust as needed)
    local patterns=(
        '\[(4K|2K|1080p|720p|480p|[0-9]+x[0-9]+)[^]]*\]' # Resolution/Codec like [1080p H.264]
        '\{[^}]*\}'                                      # Language like {mal} or {eng,mal}
        '\(SUB:[^)]*\)'                                  # Subtitle like (SUB: eng)
        '\[[0-9.]+([KMGTP]B?)\]'                         # Size like [4.6G]
        '\[[^]]*(Mal|Tam|Tel|Hin|Kan)[^]]*(\+[^]]*)+\]' # Multi-language like [Tam + Mal + Kan]
        '\[[^]]*Mal[^]]*\]'                              # Specific Mal tag like [Mal]
        '\((DD\+?[0-9]\.[0-9] - [0-9]+Kbps)\)'           # Audio format like (DD+5.1 - 192Kbps)
        'WEB-DL'
        'WEBRip'
        'BluRay'
        'HDTV'
        'ESub'
        # Add other common tags you want removed here
    )

    # Loop multiple times to catch nested/repeated tags
    for _ in {1..5}; do
        for pattern in "${patterns[@]}"; do
            base_name=$(echo "$base_name" | sed -E "s/${pattern}//gi")
        done
        # Clean up common separators left behind after tag removal
        base_name=$(echo "$base_name" | sed -E 's/ - -+/- /g' | sed 's/ \+ / /g' | sed 's/ \. / /g')
        # Remove trailing/leading hyphens/spaces/dots potentially left by removals
        base_name=$(echo "$base_name" | sed -E 's/^[\s.-]+|[\s.-]+$//g' | sed -E 's/[\s.-]+/ /g')
    done

    # Final cleanup of multiple spaces
    echo "$base_name" | sed -E 's/\s{2,}/ /g' | sed -E 's/^\s+|\s+$//g'
}

# Function to clean filenames (remove site prefixes, etc., and strip metadata)
clean_filename() {
    local filename="$1"
    local original_extension="${filename##*.}"
    # Ensure we handle cases with no extension or multiple dots correctly
    local name_part="${filename}"
    if [[ "$filename" == *.* ]]; then
      name_part="${filename%.*}"
    fi

    # 1. Remove common prefixes and references
    local cleaned=$(echo "$name_part" | sed -E 's/^www\.[0-9]*TamilMV\.[a-zA-Z]{2,3}\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^TamilMV\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\.st\.//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\.st\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Sanet\s*-\s*//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Softarchive\.is\.//i')
    cleaned=$(echo "$cleaned" | sed -E 's/^Softarchive\.is\s*-\s*//i')

    # 2. Aggressively strip all metadata tags from the remaining name part
    cleaned=$(strip_metadata_from_basename "$cleaned")

    # 3. Replace underscores with spaces AFTER stripping tags
    cleaned=$(echo "$cleaned" | sed 's/_/ /g')

    # 4. Final cleanup of spaces
    cleaned=$(echo "$cleaned" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')

    # 5. Re-attach the original extension (if one existed)
    if [[ "$filename" == *.* ]]; then
      echo "${cleaned}.${original_extension}"
    else
      echo "${cleaned}" # No original extension
    fi
}

# Function to determine if a file is a TV show or movie
identify_media_type() {
    local filename="$1" # Use the cleaned filename (after tag stripping) for type identification
    local base_name_no_ext="${filename%.*}"

    # Check for TV show patterns
    if echo "$base_name_no_ext" | grep -Eqi 'S[0-9]{2}E[0-9]{2}|Season\s?[0-9]{1,2}\s?Episode\s?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}|Ep\s?[0-9]{1,2}'; then
        echo "tvshow"
    else
        echo "movie"
    fi
}

# Function to extract resolution from media file
extract_resolution() {
    local file="$1"
    local resolution=""
    if ! command -v mediainfo >/dev/null 2>&1; then log "WARNING: mediainfo not found, cannot extract resolution."; echo ""; return; fi
    local width=$(mediainfo --Output="Video;%Width%" "$file" | head -n1)
    local height=$(mediainfo --Output="Video;%Height%" "$file" | head -n1)
    if [ -n "$width" ] && [ -n "$height" ]; then
        if [ "$height" -ge 2160 ]; then resolution="4K"
        elif [ "$height" -ge 1440 ]; then resolution="2K"
        elif [ "$height" -ge 1080 ]; then resolution="1080p"
        elif [ "$height" -ge 720 ]; then resolution="720p"
        elif [ "$height" -ge 480 ]; then resolution="480p"
        else resolution="${width}x${height}"
        fi
    fi
    echo "$resolution"
}

# Function to extract codec information
extract_codec() {
    local file="$1"
    local codec=""
    if ! command -v mediainfo >/dev/null 2>&1; then log "WARNING: mediainfo not found, cannot extract codec."; echo ""; return; fi
    codec=$(mediainfo --Output="Video;%Format%" "$file" | head -n1)
    shopt -s nocasematch
    case "$codec" in AVC|H.264|H264|"MPEG-4 AVC") codec="H.264";; HEVC|H.265|H265|"MPEG-H HEVC") codec="H.265";; *) ;; esac
    shopt -u nocasematch
    echo "$codec"
}

# Function to get formatted file size
get_formatted_size() {
    local file="$1"
    local size=$(du -sh "$file" 2>/dev/null | cut -f1 | sed 's/\s//g')
    echo "$size"
}

# Function to check for subtitle availability
check_subtitles() {
    local file="$1"
    local has_subtitles="false"
    if ! command -v mediainfo >/dev/null 2>&1; then log "WARNING: mediainfo not found, cannot check subtitles."; echo "$has_subtitles"; return; fi
    local sub_count=$(mediainfo --Output="Text;%StreamCount%" "$file" | head -n1)
    if [[ "$sub_count" -gt 0 ]]; then has_subtitles="true"; fi
    echo "$has_subtitles"
}

# Function to get language codes for subtitles
get_subtitle_languages() {
    local file="$1"
    local sub_langs=""
    if ! command -v mediainfo >/dev/null 2>&1; then log "WARNING: mediainfo not found, cannot get subtitle languages."; echo ""; return; fi
    sub_langs=$(mediainfo --Output="Text;%Language/String%\n" "$file" | sort -u | paste -sd,)
    local mapped_langs=""
    local IFS=','
    for lang in $sub_langs; do
         local lang_code=""
         shopt -s nocasematch
         case "$lang" in *Malayalam*|mal|ml) lang_code="mal";; *Tamil*|tam|ta) lang_code="tam";; *Telugu*|tel|te) lang_code="tel";; *Hindi*|hin|hi) lang_code="hin";; *Kannada*|kan|kn) lang_code="kan";; *English*|eng|en) lang_code="eng";; und|Undefined) lang_code="";; *) lang_code="$lang";; esac
         shopt -u nocasematch
         if [ -n "$lang_code" ]; then
             if [ -z "$mapped_langs" ]; then mapped_langs="$lang_code"; elif [[ ! ",$mapped_langs," == *",$lang_code,"* ]]; then mapped_langs="$mapped_langs,$lang_code"; fi
         fi
    done
    echo "$mapped_langs"
}

# Extract season and episode information from filename
extract_season_episode() {
    local filename="$1" # Expects filename *after* tag stripping
    local base_name_no_ext="${filename%.*}"
    local season_ep=""
    shopt -s nocasematch
    if [[ $base_name_no_ext =~ S([0-9]+)[._\ ]?E([0-9]+) ]]; then season=$(printf "%02d" $((10#${BASH_REMATCH[1]}))); episode=$(printf "%02d" $((10#${BASH_REMATCH[2]}))); season_ep="S${season}E${episode}";
    elif [[ $base_name_no_ext =~ ([0-9]+)x([0-9]+) ]]; then season=$(printf "%02d" $((10#${BASH_REMATCH[1]}))); episode=$(printf "%02d" $((10#${BASH_REMATCH[2]}))); season_ep="S${season}E${episode}";
    elif [[ $base_name_no_ext =~ Season[._\ ]?([0-9]+)[._\ ]?Episode[._\ ]?([0-9]+) ]]; then season=$(printf "%02d" $((10#${BASH_REMATCH[1]}))); episode=$(printf "%02d" $((10#${BASH_REMATCH[2]}))); season_ep="S${season}E${episode}";
    elif [[ $base_name_no_ext =~ (Ep|E)[._\ ]?([0-9]+) ]]; then season="01"; episode=$(printf "%02d" $((10#${BASH_REMATCH[2]}))); season_ep="S${season}E${episode}"; fi
    shopt -u nocasematch
    echo "$season_ep"
}

# Function to format the final media filename with all metadata
format_media_filename() {
    local file="$1"             # Path to the file (original or extracted) to get metadata from
    local base_name="$2"        # Base name *after* all cleaning (prefixes, tags)
    local detected_languages="$3" # Comma-separated languages detected in the file_to_process
    local extension="${file##*.}"

    # --- Get metadata from the actual file being processed ---
    local resolution=$(extract_resolution "$file")
    local codec=$(extract_codec "$file")
    local size=$(get_formatted_size "$file")
    local has_subs=$(check_subtitles "$file")
    local sub_langs=$(get_subtitle_languages "$file")

    # --- Construct the new filename ---
    local formatted_name="${base_name}" # Start with the cleaned base name

    # Add resolution and codec tag: [1080p H.264]
    local res_codec_tag=""
    if [ -n "$resolution" ]; then res_codec_tag="$resolution"; if [ -n "$codec" ]; then res_codec_tag="$res_codec_tag $codec"; fi; formatted_name="${formatted_name} [${res_codec_tag}]"; fi


    # Add subtitle tag: (SUB: eng)
    if [ "$has_subs" = "true" ] && [ -n "$sub_langs" ]; then formatted_name="${formatted_name} (SUB: ${sub_langs})"; fi

    # Add size tag: [4.6G]
    if [ -n "$size" ]; then formatted_name="${formatted_name} [${size}]"; fi

    # Replace problematic characters for filesystems
    formatted_name=$(echo "$formatted_name" | tr ':' '-' | tr '/' '-' | tr '\\' '-' | tr '*' '-' | tr '?' '-' | tr '"' "'" | tr '<' '(' | tr '>' ')' | tr '|' '-')

    # Ensure the correct extension is present
    formatted_name="${formatted_name}.${extension}"

    echo "$formatted_name"
}