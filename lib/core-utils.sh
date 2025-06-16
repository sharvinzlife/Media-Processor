#!/bin/bash
#
# Core Utilities Module
# Contains unified functions used across the media processor
#

# Unified language detection function
detect_language() {
    local file="$1"
    local detected_lang="unknown"
    
    debug_log "Detecting language for: $file"
    
    # 1. First check mediainfo metadata
    if [ -f "$file" ]; then
        local audio_langs=""
        if command -v mediainfo >/dev/null 2>&1; then
            audio_langs=$(mediainfo --Output='Audio;%Language/String%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
            debug_log "MediaInfo languages: $audio_langs"
            
            if [[ "$audio_langs" =~ (mal|malayalam|ml) ]]; then
                detected_lang="malayalam"
                debug_log "Found Malayalam in audio tracks"
                return 0
            elif [[ "$audio_langs" =~ (eng|english) ]]; then
                detected_lang="english"
                debug_log "Found English in audio tracks"
                return 0
            fi
            
            # Check audio titles if language not found
            local audio_titles=$(mediainfo --Output='Audio;%Title%\n' "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
            if [[ "$audio_titles" =~ (mal|malayalam|ml) ]]; then
                detected_lang="malayalam"
                debug_log "Found Malayalam in audio titles"
                return 0
            elif [[ "$audio_titles" =~ (eng|english) ]]; then
                detected_lang="english"
                debug_log "Found English in audio titles"
                return 0
            fi
        fi
    fi
    
    # 2. Check filename patterns
    local filename_lower=$(basename "${file,,}")
    if [[ "$filename_lower" =~ (mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
       [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(mal|malayalam|ml)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
        detected_lang="malayalam"
        debug_log "Found Malayalam indicators in filename"
        return 0
    elif [[ "$filename_lower" =~ (eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]] || \
         [[ "$filename_lower" =~ (\[|\{|\(|\s|\.|-|_)(eng|english)(\]|\}|\)|\s|\.|,|-|_|$) ]]; then
        detected_lang="english"
        debug_log "Found English indicators in filename"
        return 0
    fi
    
    # 3. Check for South Indian content indicators
    if [[ "$filename_lower" =~ (tamilmv|tamil|southindian) ]]; then
        detected_lang="malayalam"
        debug_log "Found South Indian content indicators, assuming Malayalam"
        return 0
    fi
    
    # 4. Default to English if audio tracks exist but no language identified
    if [ -f "$file" ] && command -v mediainfo >/dev/null 2>&1; then
        local has_audio=$(mediainfo --Output='Audio;%Duration%\n' "$file" 2>/dev/null)
        if [ -n "$has_audio" ]; then
            detected_lang="english"
            debug_log "Defaulting to English for media with audio tracks"
            return 0
        fi
    fi
    
    debug_log "Could not determine language, returning: $detected_lang"
    echo "$detected_lang"
    return 0
}

# Unified filename cleaning function
clean_filename() {
    local filename="$1"
    local keep_tags="${2:-false}"
    local extension="${filename##*.}"
    local basename="${filename%.*}"
    
    debug_log "Cleaning filename: $filename (keep_tags=$keep_tags)"
    
    # 1. Remove common download site prefixes
    local cleaned=$(echo "$basename" | sed -E '
        s/^www\.[0-9]*TamilMV\.[a-zA-Z]{2,}(\s*-\s*|\.)//i;
        s/^TamilMV(\s*-\s*|\.)//i;
        s/^TamilBlasters(\s*-\s*|\.)//i;
        s/^1TamilMV\.([a-zA-Z]{2,})(\s*-\s*|\.)//i;
        s/^Sanet\.(st|me|lol)(\s*-\s*|\.)//i;
        s/^Softarchive(\s*-\s*|\.)//i;
        s/^www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\s*-\s*|\.)//i
    ')
    
    if [ "$keep_tags" = "false" ]; then
        # 2. Remove quality, resolution, and language tags
        cleaned=$(echo "$cleaned" | sed -E '
            s/\[(4K|2K|1080p|720p|480p|[0-9]+x[0-9]+)[^]]*\]//g;
            s/\{[^}]*\}//g;
            s/\([12][0-9]{3}\)$//g;
            s/\[(Tam|Mal|Tel|Hin|Kan)(\+[^]]*)*\]//g;
            s/\b(HEVC|x265|H\.265|x264|H\.264)\b//gi;
            s/\b(WEB-DL|WEBRip|BluRay|HDTV|ESub)\b//gi
        ')
    fi
    
    # 3. Fix common word truncations
    cleaned=$(echo "$cleaned" | sed -E '
        s/\bcla\b/class/g;
        s/\bgla\b/glass/g;
        s/\bpa\b/pass/g;
        s/\bcro\b/cross/g;
        s/\bwhite[[:space:]]*lotu\b/white lotus/g;
        s/\barrival\b([[:space:]])/arrivals\1/g
    ')
    
    # 4. Final cleanup
    cleaned=$(echo "$cleaned" | sed -E '
        s/_/ /g;                     # Replace underscores with spaces
        s/\s{2,}/ /g;               # Remove multiple spaces
        s/^[\s.-]+|[\s.-]+$//g;     # Trim spaces/dots/hyphens
        s/[\s.-]+/ /g               # Normalize separators
    ')
    
    echo "${cleaned}.${extension}"
}

# Unified media type detection
detect_media_type() {
    local filename="$1"
    local basename="${filename%.*}"
    
    debug_log "Detecting media type for: $filename"
    
    # TV Show patterns (in order of reliability)
    local patterns=(
        's[0-9]{2}e[0-9]{2}'                    # S01E01
        'season[[:space:]]*[0-9]+[[:space:]]*episode[[:space:]]*[0-9]+' # Season 1 Episode 1
        '[0-9]+x[0-9]{2}'                       # 1x01
        'ep[[:space:]]*[0-9]+'                  # Ep 01
    )
    
    # Convert to lowercase for case-insensitive matching
    local lower_name=$(echo "$basename" | tr '[:upper:]' '[:lower:]')
    
    # Check each pattern
    for pattern in "${patterns[@]}"; do
        if echo "$lower_name" | grep -Eq "$pattern"; then
            debug_log "Matched TV show pattern: $pattern"
            echo "tvshow"
            return 0
        fi
    done
    
    # Additional checks for known TV show indicators
    if [[ "$lower_name" =~ (complete|season|episode|series) ]]; then
        debug_log "Found TV show keyword indicator"
        echo "tvshow"
        return 0
    fi
    
    debug_log "No TV show patterns found, assuming movie"
    echo "movie"
    return 0
}

# Extract season and episode information
extract_season_episode() {
    local filename="$1"
    local season_ep=""
    
    # Try to match S01E01 format
    if [[ $filename =~ S([0-9]+)E([0-9]+) ]]; then
        local season=$(printf "%02d" "${BASH_REMATCH[1]}")
        local episode=$(printf "%02d" "${BASH_REMATCH[2]}")
        season_ep="S${season}E${episode}"
    # Try 1x01 format
    elif [[ $filename =~ ([0-9]+)x([0-9]+) ]]; then
        local season=$(printf "%02d" "${BASH_REMATCH[1]}")
        local episode=$(printf "%02d" "${BASH_REMATCH[2]}")
        season_ep="S${season}E${episode}"
    # Try "Season X Episode Y" format
    elif [[ $filename =~ [Ss]eason[[:space:]]*([0-9]+)[[:space:]]*[Ee]pisode[[:space:]]*([0-9]+) ]]; then
        local season=$(printf "%02d" "${BASH_REMATCH[1]}")
        local episode=$(printf "%02d" "${BASH_REMATCH[2]}")
        season_ep="S${season}E${episode}"
    fi
    
    echo "$season_ep"
}

# Extract series name from filename
extract_series_name() {
    local filename="$1"
    local series_name=""
    
    # Clean up filename first
    local clean_name=$(clean_filename "$filename" "true")
    clean_name="${clean_name%.*}" # Remove extension
    
    # Try to extract series name before season/episode markers
    if [[ $clean_name =~ (.+?)[Ss][0-9]{1,2}[Ee][0-9]{1,2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $clean_name =~ (.+?)[0-9]{1,2}x[0-9]{1,2} ]]; then
        series_name="${BASH_REMATCH[1]}"
    elif [[ $clean_name =~ (.+?)[Ss]eason[[:space:]]*[0-9]+ ]]; then
        series_name="${BASH_REMATCH[1]}"
    else
        series_name="$clean_name"
    fi
    
    # Clean up series name
    series_name=$(echo "$series_name" | sed -E 's/[-._]+/ /g' | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
    echo "$series_name"
}

# Get formatted file size
get_formatted_size() {
    local file="$1"
    local size=$(stat -f %z "$file" 2>/dev/null || stat -c %s "$file" 2>/dev/null)
    
    if [ -n "$size" ]; then
        if [ $size -ge 1073741824 ]; then # 1 GB
            echo "$(echo "scale=2; $size/1073741824" | bc)GB"
        elif [ $size -ge 1048576 ]; then # 1 MB
            echo "$(echo "scale=2; $size/1048576" | bc)MB"
        elif [ $size -ge 1024 ]; then # 1 KB
            echo "$(echo "scale=2; $size/1024" | bc)KB"
        else
            echo "${size}B"
        fi
    else
        echo "0B"
    fi
}

# Unified media file info extraction
get_media_info() {
    local file="$1"
    local info=""
    
    # Get resolution
    if command -v mediainfo >/dev/null 2>&1; then
        local height=$(mediainfo --Output="Video;%Height%" "$file" 2>/dev/null | head -1)
        if [ -n "$height" ]; then
            if [ $height -ge 2160 ]; then
                info="4K"
            elif [ $height -ge 1440 ]; then
                info="2K"
            elif [ $height -ge 1080 ]; then
                info="1080p"
            elif [ $height -ge 720 ]; then
                info="720p"
            elif [ $height -ge 480 ]; then
                info="480p"
            fi
        fi
    fi
    
    # Get codec
    if command -v mediainfo >/dev/null 2>&1; then
        local codec=$(mediainfo --Output="Video;%Format%" "$file" 2>/dev/null | head -1)
        if [ -n "$codec" ]; then
            if [[ "$codec" =~ HEVC|H.265|H265 ]]; then
                info="$info HEVC"
            elif [[ "$codec" =~ AVC|H.264|H264 ]]; then
                info="$info H.264"
            else
                info="$info $codec"
            fi
        fi
    fi
    
    # Get file size
    local size=$(get_formatted_size "$file")
    if [ -n "$size" ]; then
        info="$info $size"
    fi
    
    # Clean up and return
    info=$(echo "$info" | sed -E 's/^\s+|\s+$//g' | sed -E 's/\s+/ /g')
    echo "$info"
}
