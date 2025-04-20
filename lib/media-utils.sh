#!/bin/bash
#
# Media Utilities Module
# Functions for media file analysis, language detection, and metadata extraction
#

# Import logger if not already loaded
if ! type log > /dev/null 2>&1; then
    source "$(dirname "$0")/logger.sh"
fi

# Function to determine if a file is a TV show or movie
is_tvshow() {
    local filename="$1"
    
    # Check for TV show patterns
    if echo "$filename" | grep -E 'S[0-9]{2}E[0-9]{2}|Season\s?[0-9]{1,2}\s?Episode\s?[0-9]{1,2}|[0-9]{1,2}x[0-9]{1,2}|Ep\s?[0-9]{1,2}' -i > /dev/null; then
        return 0  # true in bash
    else
        return 1  # false in bash
    fi
}

# Function to identify media type as string
identify_media_type() {
    local filename="$1"
    
    if is_tvshow "$filename"; then
        echo "tvshow"
    else
        echo "movie"
    fi
}

# Function to determine if content is Malayalam or English
identify_language() {
    local input="$1"
    local filename=""
    
    # Check if input is a file or a string
    if [ -f "$input" ]; then
        # It's a file, so extract audio languages first
        local detected_languages=$(extract_language_tracks "$input")
        
        # If language detected from file, use it
        if [ -n "$detected_languages" ]; then
            if echo "$detected_languages" | grep -i "mal\|malayalam" > /dev/null; then
                echo "malayalam"
                return 0
            elif echo "$detected_languages" | grep -i "eng\|english" > /dev/null; then
                echo "english"
                return 0
            fi
        fi
        
        # Fallback to filename analysis
        filename=$(basename "$input")
    else
        # It's a string (filename)
        filename="$input"
    fi
    
    # Convert to lowercase for case-insensitive matching
    filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    
    # Look for language indicators in the filename
    if echo "$filename" | grep -E 'malayalam|mal\b|\bm\b' > /dev/null; then
        echo "malayalam"
        return 0
    elif echo "$filename" | grep -E 'english|eng\b|\be\b' > /dev/null; then
        echo "english"
        return 0
    fi
    
    # Try deeper analysis using mediainfo if this is a file
    if [ -f "$input" ] && command -v mediainfo >/dev/null 2>&1; then
        local track_langs=$(mediainfo --Output="Audio;%Language/String%" "$input" 2>/dev/null)
        if echo "$track_langs" | grep -i "Malayalam" > /dev/null; then
            echo "malayalam"
            return 0
        elif echo "$track_langs" | grep -i "English" > /dev/null; then
            echo "english"
            return 0
        fi
        
        # Check track titles for language hints
        local track_titles=$(mediainfo --Output="Audio;%Title%" "$input" 2>/dev/null)
        if echo "$track_titles" | grep -i "Malayalam\|Mal" > /dev/null; then
            echo "malayalam"
            return 0
        elif echo "$track_titles" | grep -i "English\|Eng" > /dev/null; then
            echo "english"
            return 0
        fi
        
        # If any audio tracks exist but no specific language identified, default to English
        if [ -n "$track_langs" ]; then
            log "Audio tracks found but no specific language identified, defaulting to English"
            echo "english"
            return 0
        fi
    fi
    
    # Default if no language detected
    echo "unknown"
}

# Function to extract language tracks from a media file
extract_language_tracks() {
    local file="$1"
    local detected_languages=""
    
    # Skip extraction if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: File not found for language detection: $file"
        return 1
    fi
    
    # Check for mediainfo or ffprobe
    if command -v mediainfo >/dev/null 2>&1; then
        # Extract audio tracks using mediainfo
        detected_languages=$(mediainfo --Output="Audio;%Language%" "$file" 2>/dev/null | sort | uniq | tr '\n' ',' | sed 's/,$//')
        
        # Check for common language codes and convert to readable names
        detected_languages=$(echo "$detected_languages" | sed 's/mal/malayalam/g' | sed 's/eng/english/g')
        
        if [ -n "$detected_languages" ]; then
            log "MediaInfo detected languages: $detected_languages"
            echo "$detected_languages"
            return 0
        fi
    fi
    
    if command -v ffprobe >/dev/null 2>&1; then
        # Extract audio tracks using ffprobe as fallback
        detected_languages=$(ffprobe -v error -select_streams a -show_entries stream_tags=language -of compact=p=0:nk=1 "$file" 2>/dev/null | sort | uniq | tr '\n' ',' | sed 's/,$//')
        
        # Check for common language codes and convert to readable names
        detected_languages=$(echo "$detected_languages" | sed 's/mal/malayalam/g' | sed 's/eng/english/g')
        
        if [ -n "$detected_languages" ]; then
            log "FFprobe detected languages: $detected_languages"
            echo "$detected_languages"
            return 0
        fi
    fi
    
    log "WARNING: Could not detect languages from file: $file"
    return 1
}

# Function to extract resolution from media file
extract_resolution() {
    local file="$1"
    local resolution=""
    
    # First check if filename contains resolution indicators
    local filename=$(basename "$file")
    if [[ "$filename" =~ 1080[pP] ]]; then
        resolution="1080p"
        return 0
    elif [[ "$filename" =~ 720[pP] ]]; then
        resolution="720p"
        return 0
    elif [[ "$filename" =~ 2160[pP] || "$filename" =~ 4[kK] ]]; then
        resolution="4K"
        return 0
    elif [[ "$filename" =~ 1440[pP] || "$filename" =~ 2[kK] ]]; then
        resolution="2K"
        return 0
    elif [[ "$filename" =~ 480[pP] ]]; then
        resolution="480p"
        return 0
    fi
    
    # If no resolution found in filename, check file metadata
    if command -v mediainfo >/dev/null 2>&1; then
        local width=$(mediainfo --Output="Video;%Width%" "$file" 2>/dev/null | head -n1)
        local height=$(mediainfo --Output="Video;%Height%" "$file" 2>/dev/null | head -n1)
        
        if [ -n "$width" ] && [ -n "$height" ]; then
            # Determine standard resolution name
            if [ "$height" -ge 2160 ]; then
                resolution="4K"
            elif [ "$height" -ge 1440 ]; then
                resolution="2K"
            elif [ "$height" -ge 1080 ]; then
                resolution="1080p"
            elif [ "$height" -ge 720 ]; then
                resolution="720p"
            elif [ "$height" -ge 480 ]; then
                resolution="480p"
            else
                resolution="${width}x${height}"
            fi
        fi
    elif command -v ffprobe >/dev/null 2>&1; then
        local video_info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$file" 2>/dev/null)
        
        if [ -n "$video_info" ]; then
            local width=$(echo "$video_info" | cut -d'x' -f1)
            local height=$(echo "$video_info" | cut -d'x' -f2)
            
            # Determine standard resolution name
            if [ "$height" -ge 2160 ]; then
                resolution="4K"
            elif [ "$height" -ge 1440 ]; then
                resolution="2K"
            elif [ "$height" -ge 1080 ]; then
                resolution="1080p"
            elif [ "$height" -ge 720 ]; then
                resolution="720p"
            elif [ "$height" -ge 480 ]; then
                resolution="480p"
            else
                resolution="$video_info"
            fi
        fi
    fi
    
    echo "$resolution"
}

# Function to extract codec information
extract_codec() {
    local file="$1"
    local codec=""
    
    if command -v mediainfo >/dev/null 2>&1; then
        codec=$(mediainfo --Output="Video;%Format%" "$file" 2>/dev/null | head -n1)
        
        # Simplify codec names
        case "$codec" in
            "AVC"|"H.264"|"H264"|"MPEG-4 AVC")
                codec="H.264"
                ;;
            "HEVC"|"H.265"|"H265"|"MPEG-H HEVC")
                codec="H.265"
                ;;
            *)
                # Keep as is for other codecs
                ;;
        esac
    elif command -v ffprobe >/dev/null 2>&1; then
        codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$file" 2>/dev/null)
        
        # Simplify codec names
        case "$codec" in
            "h264"|"libx264"|"avc")
                codec="H.264"
                ;;
            "h265"|"libx265"|"hevc")
                codec="H.265"
                ;;
            *)
                # Keep as is for other codecs
                ;;
        esac
    fi
    
    echo "$codec"
}

# Function to get formatted file size
get_formatted_size() {
    local file="$1"
    local size=$(du -h "$file" 2>/dev/null | cut -f1)
    echo "$size"
}

# Function to check for subtitle availability
check_subtitles() {
    local file="$1"
    local has_subtitles=false
    
    if command -v mediainfo >/dev/null 2>&1; then
        local sub_count=$(mediainfo --Output="Text;%StreamCount%" "$file" 2>/dev/null | wc -l)
        if [ "$sub_count" -gt 0 ]; then
            has_subtitles=true
        fi
    elif command -v ffprobe >/dev/null 2>&1; then
        local sub_count=$(ffprobe -v error -select_streams s -show_entries stream=index -of default=noprint_wrappers=1:nokey=1 "$file" 2>/dev/null | wc -l)
        if [ "$sub_count" -gt 0 ]; then
            has_subtitles=true
        fi
    fi
    
    echo "$has_subtitles"
}

# Function to get language codes for subtitles
get_subtitle_languages() {
    local file="$1"
    local sub_langs=""
    
    if command -v mediainfo >/dev/null 2>&1; then
        sub_langs=$(mediainfo --Output="Text;%Language%" "$file" 2>/dev/null | sort | uniq | tr '\n' ',' | sed 's/,$//')
        # Convert codes to names
        sub_langs=$(echo "$sub_langs" | sed 's/mal/Malayalam/g' | sed 's/eng/English/g')
    elif command -v ffprobe >/dev/null 2>&1; then
        sub_langs=$(ffprobe -v error -select_streams s -show_entries stream_tags=language -of compact=p=0:nk=1 "$file" 2>/dev/null | sort | uniq | tr '\n' ',' | sed 's/,$//')
        # Convert codes to names
        sub_langs=$(echo "$sub_langs" | sed 's/mal/Malayalam/g' | sed 's/eng/English/g')
    fi
    
    echo "$sub_langs"
}

# Extract season and episode information from filename
extract_season_episode() {
    local filename="$1"
    local season_ep=""
    
    # Try to match S01E01 format
    if [[ $filename =~ S([0-9]+)E([0-9]+) ]]; then
        local season="${BASH_REMATCH[1]}"
        local episode="${BASH_REMATCH[2]}"
        season_ep="S${season}E${episode}"
    # Try alternative formats like 1x01
    elif [[ $filename =~ ([0-9]+)x([0-9]+) ]]; then
        local season="${BASH_REMATCH[1]}"
        local episode="${BASH_REMATCH[2]}"
        # Reformat to standard S01E01 format
        season_ep=$(printf "S%02dE%02d" "$season" "$episode")
    # Try to extract from filenames with just 101, 102 etc.
    elif [[ $filename =~ [^0-9]([0-9])([0-9]{2})[^0-9] ]]; then
        local season="${BASH_REMATCH[1]}"
        local episode="${BASH_REMATCH[2]}"
        season_ep=$(printf "S%02dE%02d" "$season" "$episode")
    fi
    
    echo "$season_ep"
}

# Extract the series name from a TV show filename
extract_series_name() {
    local filename="$1"
    local series_name=""
    
    # Clean up the filename for better parsing
    local clean_name=$(echo "$filename" | sed -E 's/\.[^.]+$//' | sed -E 's/[._]/ /g')
    
    # Handle standard season episode formats: S01E01, S01.E01, S01_E01, etc
    if [[ $clean_name =~ (.*)[sS]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
        series_name="${BASH_REMATCH[1]}"
    # Handle format like "Show Name - 1x01"
    elif [[ $clean_name =~ (.*)(-|–|\s)\s*([0-9]{1,2})x([0-9]{1,2}) ]]; then
        series_name="${BASH_REMATCH[1]}"
    # Handle format like "Show Name - Season 1 Episode 01"
    elif [[ $clean_name =~ (.*)(-|–|\s)\s*[sS]eason\s*([0-9]{1,2})\s*[eE]pisode\s*([0-9]{1,2}) ]]; then
        series_name="${BASH_REMATCH[1]}"
    else
        # Fallback - just return the filename without extension
        series_name="$clean_name"
    fi
    
    # Clean up the series name - remove trailing separators and whitespace
    series_name=$(echo "$series_name" | sed -E 's/[-_\s]+$//' | sed -E 's/^\s+|\s+$//')
    
    echo "$series_name"
}

# Get Season folder name from filename
get_season_folder() {
    local filename="$1"
    local season_folder="Season 01"  # Default
    
    # Extract season information
    local season_ep=$(extract_season_episode "$filename")
    
    # If season info found, format proper folder name
    if [[ $season_ep =~ S([0-9]{2}) ]]; then
        local season="${BASH_REMATCH[1]}"
        # Remove leading zeros for display
        season_num=$(echo "$season" | sed 's/^0*//')
        season_folder="Season $season_num"
    fi
    
    echo "$season_folder"
}

# Get media file resolution, codec and size information
get_media_info() {
    local file="$1"
    local resolution=$(extract_resolution "$file")
    local codec=$(extract_codec "$file")
    local filesize=$(get_formatted_size "$file")
    
    # Create info string with the gathered information
    local info=""
    if [ -n "$resolution" ]; then
        info="$info $resolution"
    fi
    
    if [ -n "$codec" ]; then
        info="$info $codec"
    fi
    
    if [ -n "$filesize" ]; then
        info="$info $filesize"
    fi
    
    echo "$info"
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