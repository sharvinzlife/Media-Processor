#!/bin/bash
#
# Media Detection Library
# ----------------------
#
# This library provides functions for detecting and formatting media file 
# information such as resolution, codec, audio languages, subtitles,
# and file size.
#
# Functions:
# - detect_language: Determines the primary language of media content
# - detect_resolution: Identifies video resolution from filename or media metadata
# - detect_codec: Detects video codec from filename or media metadata
# - detect_subtitles: Identifies subtitle tracks and their languages
# - detect_audio_languages: Detects audio tracks and their languages
# - get_file_size_formatted: Formats file size in human-readable format
# - format_filename: Creates a well-formatted filename with all detected info
#
# Usage:
# source "lib/media-detection.sh"
# resolution=$(detect_resolution "movie.mkv")
# formatted_name=$(format_filename "movie.mkv")
#

# Load required libraries
if [ -z "$DEBUG_LOG_ENABLED" ]; then
    source "$(dirname "$0")/logger.sh"
fi

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

# Function to detect video resolution (4K, 1080p, 720p, etc.)
detect_resolution() {
    local file="$1"
    local filename=$(basename "$file")
    local resolution=""
    
    # First try to extract resolution from filename
    if [[ "$filename" =~ [^0-9](4320|2160|1080|720|480|360)[pP] ]]; then
        resolution="${BASH_REMATCH[1]}p"
        log_debug "Resolution from filename: $resolution"
    elif [[ "$filename" =~ [^a-zA-Z0-9](4[kK]|8[kK]|UHD) ]]; then
        if [[ "${BASH_REMATCH[1],,}" == "4k" || "${BASH_REMATCH[1],,}" == "uhd" ]]; then
            resolution="2160p"
        elif [[ "${BASH_REMATCH[1],,}" == "8k" ]]; then
            resolution="4320p"
        fi
        log_debug "Resolution from filename (4K/8K/UHD): $resolution"
    fi
    
    # If resolution wasn't in the filename, use ffprobe to get actual video resolution
    if [[ -z "$resolution" && -f "$file" ]]; then
        local height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$file" 2>/dev/null)
        
        if [[ -n "$height" ]]; then
            if (( height > 2160 )); then
                resolution="4320p"
            elif (( height > 1080 && height <= 2160 )); then
                resolution="2160p"
            elif (( height > 720 && height <= 1080 )); then
                resolution="1080p"
            elif (( height > 480 && height <= 720 )); then
                resolution="720p"
            elif (( height > 360 && height <= 480 )); then
                resolution="480p"
            elif (( height <= 360 )); then
                resolution="360p"
            fi
            log_debug "Resolution from ffprobe: $resolution (height=$height)"
        fi
    fi
    
    if [[ -z "$resolution" ]]; then
        resolution="unknown"
    fi
    
    echo "$resolution"
}

# Function to extract codec information
extract_codec() {
    local file="$1"
    local codec=""
    
    # Extract codec from file metadata
    local codec_name=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$file" 2>/dev/null)
    log_debug "Codec from metadata: $codec_name"
    
    if [[ -n "$codec_name" ]]; then
        case "$codec_name" in
            h264|avc*)
                codec="H.264"
                ;;
            hevc|h265*)
                codec="H.265"
                ;;
            vp9)
                codec="VP9"
                ;;
            av1)
                codec="AV1"
                ;;
            *)
                codec="$codec_name"
                ;;
        esac
    fi
    
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

# Function to format media filename with resolution, codec, and size info
format_media_filename() {
    local file="$1"
    local title="$2"
    local ext="${file##*.}"
    local formatted_name=""
    
    # Extract metadata
    local resolution=$(detect_resolution "$file")
    local codec=$(extract_codec "$file")
    local subtitle_info=$(extract_subtitle_info "$file")
    local size=$(get_file_size_formatted "$file")
    
    # Start with the title
    formatted_name="$title"
    
    # Add resolution and codec if available
    if [[ -n "$resolution" && -n "$codec" ]]; then
        formatted_name="$formatted_name [$resolution $codec]"
    elif [[ -n "$resolution" ]]; then
        formatted_name="$formatted_name [$resolution]"
    elif [[ -n "$codec" ]]; then
        formatted_name="$formatted_name [$codec]"
    fi
    
    # Add subtitle info if available
    if [[ -n "$subtitle_info" ]]; then
        formatted_name="$formatted_name ($subtitle_info)"
    fi
    
    # Add file size
    if [[ -n "$size" ]]; then
        formatted_name="$formatted_name [$size]"
    fi
    
    # Add extension
    formatted_name="$formatted_name.$ext"
    
    echo "$formatted_name"
}

# Function to extract subtitle information
extract_subtitle_info() {
    local file="$1"
    local subtitle_info=""
    
    # Use ffprobe to list subtitle streams
    local subtitle_langs=$(ffprobe -v error -select_streams s -show_entries stream=codec_name,language -of csv=p=0 "$file" 2>/dev/null)
    
    if [[ -n "$subtitle_langs" ]]; then
        # Extract language codes
        local langs=$(echo "$subtitle_langs" | grep -oE '[a-z]{3}' | sort -u | tr '\n' ' ' | sed 's/ $//')
        
        # Convert to more readable format
        if [[ -n "$langs" ]]; then
            subtitle_info=$(echo "$langs" | sed 's/eng/eng/g; s/fre/fra/g; s/ger/deu/g; s/spa/esp/g; s/ita/ita/g; s/jpn/jpn/g; s/kor/kor/g; s/chi/zho/g; s/por/por/g; s/rus/rus/g')
        fi
    fi
    
    echo "$subtitle_info"
}

# Function to get file size in human-readable format
get_file_size_formatted() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        echo "unknown"
        return 1
    fi
    
    # Get file size in bytes
    local size=$(stat -c %s "$file" 2>/dev/null)
    
    if [[ -z "$size" || ! "$size" =~ ^[0-9]+$ ]]; then
        echo "unknown"
        return 1
    fi
    
    # Convert to human-readable format
    if (( size >= 1073741824 )); then  # 1 GB
        printf "%.1fG" "$(echo "scale=1; $size / 1073741824" | bc)"
    elif (( size >= 1048576 )); then   # 1 MB
        printf "%.1fM" "$(echo "scale=1; $size / 1048576" | bc)"
    elif (( size >= 1024 )); then      # 1 KB
        printf "%.1fK" "$(echo "scale=1; $size / 1024" | bc)"
    else
        echo "${size}B"
    fi
}

format_filename() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    # Detect language
    local language=$(detect_language "$input_file")
    debug_log "Detected language: $language"
    
    # Detect resolution
    local resolution=$(detect_resolution "$input_file")
    debug_log "Detected resolution: $resolution"
    
    # Detect codec
    local codec=$(detect_codec "$input_file")
    debug_log "Detected codec: $codec"
    
    # Get subtitle info
    local subtitle_info=$(detect_subtitles "$input_file")
    debug_log "Detected subtitles: $subtitle_info"
    
    # Get audio language info
    local audio_info=$(detect_audio_languages "$input_file")
    debug_log "Detected audio languages: $audio_info"
    
    # Get file size
    local file_size=$(get_file_size_formatted "$input_file")
    debug_log "File size: $file_size"
    
    # Format the filename with all the information
    local formatted_filename="$basename"
    if [[ "$resolution" != "unknown" && "$codec" != "unknown" ]]; then
        formatted_filename="$basename [$resolution $codec]"
    elif [[ "$resolution" != "unknown" ]]; then
        formatted_filename="$basename [$resolution]"
    elif [[ "$codec" != "unknown" ]]; then
        formatted_filename="$basename [$codec]"
    fi
    
    # Add audio info if available
    if [[ "$audio_info" != "unknown" && "$audio_info" != "${language^^}" ]]; then
        if [[ "$audio_info" == "DUAL" || "$audio_info" == "MULTI" ]]; then
            formatted_filename="$formatted_filename ($audio_info-AUDIO)"
        else
            formatted_filename="$formatted_filename (AUDIO-$audio_info)"
        fi
    fi
    
    # Add subtitle info if available
    if [[ -n "$subtitle_info" && "$subtitle_info" != "none" ]]; then
        formatted_filename="$formatted_filename (SUB-$subtitle_info)"
    fi
    
    # Add file size if available
    if [[ "$file_size" != "unknown" ]]; then
        formatted_filename="$formatted_filename [$file_size]"
    fi
    
    echo "$formatted_filename"
}

# Function to detect the video codec of a media file
detect_codec() {
    local input_file="$1"
    
    if [[ ! -f "$input_file" ]]; then
        debug_log "File not found: $input_file"
        echo "unknown"
        return 1
    fi
    
    # Try to find codec in filename first
    local basename=$(basename "$input_file")
    if [[ "$basename" =~ [. ]HEVC[. ] || "$basename" =~ [. ]HEVC$ || "$basename" =~ [. ]x265[. ] || "$basename" =~ [. ]x265$ ]]; then
        debug_log "Codec detected from filename: HEVC"
        echo "HEVC"
        return 0
    elif [[ "$basename" =~ [. ]H264[. ] || "$basename" =~ [. ]H264$ || "$basename" =~ [. ]x264[. ] || "$basename" =~ [. ]x264$ ]]; then
        debug_log "Codec detected from filename: H264"
        echo "H264"
        return 0
    elif [[ "$basename" =~ [. ]AV1[. ] || "$basename" =~ [. ]AV1$ ]]; then
        debug_log "Codec detected from filename: AV1"
        echo "AV1"
        return 0
    elif [[ "$basename" =~ [. ]VP9[. ] || "$basename" =~ [. ]VP9$ ]]; then
        debug_log "Codec detected from filename: VP9"
        echo "VP9"
        return 0
    fi
    
    # If codec not found in filename, use ffprobe
    debug_log "Detecting codec using ffprobe for: $input_file"
    local codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$input_file" 2>/dev/null)
    
    if [[ -z "$codec" ]]; then
        debug_log "Could not detect codec using ffprobe"
        echo "unknown"
        return 1
    fi
    
    # Map ffmpeg codec names to more user-friendly names
    case "$codec" in
        hevc)
            debug_log "Codec detected via ffprobe: HEVC"
            echo "HEVC"
            ;;
        h264)
            debug_log "Codec detected via ffprobe: H264"
            echo "H264"
            ;;
        av1)
            debug_log "Codec detected via ffprobe: AV1"
            echo "AV1"
            ;;
        vp9)
            debug_log "Codec detected via ffprobe: VP9"
            echo "VP9"
            ;;
        *)
            debug_log "Codec detected via ffprobe: $codec (using as is)"
            echo "$codec" | tr '[:lower:]' '[:upper:]'
            ;;
    esac
}

# Function to detect subtitle tracks in a media file
detect_subtitles() {
    local input_file="$1"
    
    if [[ ! -f "$input_file" ]]; then
        debug_log "File not found: $input_file"
        echo "none"
        return 1
    fi
    
    # Try to find subtitle info in filename first
    local basename=$(basename "$input_file")
    if [[ "$basename" =~ [. ]SUB[S]?-([A-Za-z,]+)[. ] || "$basename" =~ [. ]SUB[S]?-([A-Za-z,]+)$ ]]; then
        local subtitle_info="${BASH_REMATCH[1]}"
        debug_log "Subtitle info detected from filename: $subtitle_info"
        echo "$subtitle_info"
        return 0
    fi
    
    # If subtitle info not found in filename, use ffprobe
    debug_log "Detecting subtitles using ffprobe for: $input_file"
    local subtitle_tracks=$(ffprobe -v error -select_streams s -show_entries stream=index:stream_tags=language -of csv=p=0 "$input_file" 2>/dev/null)
    
    if [[ -z "$subtitle_tracks" ]]; then
        debug_log "No subtitle tracks detected"
        echo "none"
        return 0
    fi
    
    # Process subtitle information
    local languages=()
    while IFS=',' read -r index language; do
        if [[ -n "$language" && "$language" != "und" ]]; then
            # Convert to uppercase and add to array if not already there
            language=$(echo "$language" | tr '[:lower:]' '[:upper:]')
            if [[ ! " ${languages[@]} " =~ " ${language} " ]]; then
                languages+=("$language")
            fi
        fi
    done < <(echo "$subtitle_tracks")
    
    if [[ ${#languages[@]} -eq 0 ]]; then
        debug_log "No identified language in subtitle tracks"
        echo "none"
        return 0
    fi
    
    # Join the languages with commas
    local result=$(IFS=,; echo "${languages[*]}")
    debug_log "Detected subtitle languages: $result"
    echo "$result"
}

# Function to detect audio languages in a media file
detect_audio_languages() {
    local input_file="$1"
    
    if [[ ! -f "$input_file" ]]; then
        debug_log "File not found: $input_file"
        echo "unknown"
        return 1
    fi
    
    # Try to find audio language info in filename first
    local basename=$(basename "$input_file")
    if [[ "$basename" =~ [. ](DUAL|MULTI)[. ] ]] || [[ "$basename" =~ [. ](DUAL|MULTI)$ ]]; then
        debug_log "Audio language detected from filename: Multiple audio tracks"
        echo "MULTI"
        return 0
    fi
    
    # Use ffprobe to identify audio tracks
    debug_log "Detecting audio languages using ffprobe for: $input_file"
    local audio_tracks=$(ffprobe -v error -select_streams a -show_entries stream=index:stream_tags=language -of csv=p=0 "$input_file" 2>/dev/null)
    
    if [[ -z "$audio_tracks" ]]; then
        debug_log "No audio track language information detected"
        echo "unknown"
        return 0
    fi
    
    # Process audio language information
    local languages=()
    while IFS=',' read -r index language; do
        if [[ -n "$language" && "$language" != "und" ]]; then
            # Convert to uppercase and add to array if not already there
            language=$(echo "$language" | tr '[:lower:]' '[:upper:]')
            if [[ ! " ${languages[@]} " =~ " ${language} " ]]; then
                languages+=("$language")
            fi
        fi
    done < <(echo "$audio_tracks")
    
    # If no languages were identified, try alternative method (mediainfo)
    if [[ ${#languages[@]} -eq 0 ]]; then
        local mediainfo_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$input_file" 2>/dev/null | tr '[:lower:]' '[:upper:]')
        if [[ -n "$mediainfo_langs" ]]; then
            while read -r language; do
                if [[ -n "$language" && "$language" != "UND" && "$language" != "UNDEFINED" ]]; then
                    if [[ ! " ${languages[@]} " =~ " ${language} " ]]; then
                        languages+=("$language")
                    fi
                fi
            done < <(echo "$mediainfo_langs")
        fi
    fi
    
    # If still no identified languages, return unknown
    if [[ ${#languages[@]} -eq 0 ]]; then
        debug_log "No identified language in audio tracks"
        echo "unknown"
        return 0
    fi
    
    # Determine if it's dual audio or multi audio
    if [[ ${#languages[@]} -eq 1 ]]; then
        local result="${languages[0]}"
        debug_log "Detected single audio language: $result"
        echo "$result"
    elif [[ ${#languages[@]} -eq 2 ]]; then
        local result="DUAL"
        debug_log "Detected dual audio languages: ${languages[*]}"
        echo "$result"
    else
        local result="MULTI"
        debug_log "Detected multiple audio languages: ${languages[*]}"
        echo "$result"
    fi
}

# Function to detect the language of a media file
detect_language() {
    local file="$1"
    local detected_language="unknown"
    
    if [ ! -f "$file" ]; then
        debug_log "Detect Language: File not found '$file'"
        echo "$detected_language"
        return 1
    fi
    
    debug_log "Detect Language: Checking '$file'"

    # Check content first (more reliable)
    if command -v mediainfo >/dev/null 2>&1; then
        local audio_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
        debug_log "Detect Language: mediainfo found languages: $audio_langs"
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
                 debug_log "Detect Language: Found malayalam in audio title"
             elif [[ "$audio_titles" =~ (eng|english) ]]; then
                 detected_language="english"
                 debug_log "Detect Language: Found english in audio title"
             fi
        fi
    fi

    # Check filename if still unknown
    if [ "$detected_language" = "unknown" ]; then
        local filename_lower=$(basename "${file,,}")
        debug_log "Detect Language: Checking filename '$filename_lower'"
        if [[ "$filename_lower" =~ (mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
           [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
            detected_language="malayalam"
        # Broaden english check slightly
        elif [[ "$filename_lower" =~ (eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
             [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
            detected_language="english"
        # Check for South Indian keywords as fallback for malayalam
        elif [[ "$filename_lower" =~ (tamilmv|tamil|southindian) ]]; then
            debug_log "Detect Language: Potential South Indian filename, assuming malayalam"
            detected_language="malayalam"
        fi
    fi

    debug_log "Detect Language: Final detected language: $detected_language"
    echo "$detected_language"
    return 0
}