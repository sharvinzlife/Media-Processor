#!/bin/bash
#
# Media Processor - Media Detection Module
# This file contains functions for media type detection and metadata extraction
#

# Source the configuration and utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

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
    
    # Remove language tags like [Tam + Tel + Hin + Mal + Kan]
    cleaned=$(echo "$cleaned" | sed -E 's/\[Tam \+ Tel \+ Hin \+ Mal \+ Kan\]//g')
    cleaned=$(echo "$cleaned" | sed -E 's/\[.*Mal.*\]//g')
    
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

# Function to extract resolution from media file
extract_resolution() {
    local file="$1"
    local resolution=""
    
    if command -v mediainfo >/dev/null 2>&1; then
        local width=$(mediainfo --Output="Video;%Width%" "$file" | head -n1)
        local height=$(mediainfo --Output="Video;%Height%" "$file" | head -n1)
        
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
        local video_info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$file")
        
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
        codec=$(mediainfo --Output="Video;%Format%" "$file" | head -n1)
        
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
        codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$file")
        
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
        local sub_count=$(mediainfo --Output="Text;%StreamCount%" "$file" | wc -l)
        if [ "$sub_count" -gt 0 ]; then
            has_subtitles=true
        fi
    elif command -v ffprobe >/dev/null 2>&1; then
        local sub_count=$(ffprobe -v error -select_streams s -show_entries stream=index -of default=noprint_wrappers=1:nokey=1 "$file" | wc -l)
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
        sub_langs=$(mediainfo --Output="Text;%Language%" "$file" | sort | uniq | tr '\n' ',' | sed 's/,$//')
    elif command -v ffprobe >/dev/null 2>&1; then
        sub_langs=$(ffprobe -v error -select_streams s -show_entries stream_tags=language -of compact=p=0:nk=1 "$file" | sort | uniq | tr '\n' ',' | sed 's/,$//')
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

# Function to format the final media filename with all metadata
format_media_filename() {
    local file="$1"
    local base_name="$2"
    local languages="$3"
    local extension="${file##*.}"
    
    # Get media information
    local resolution=$(extract_resolution "$file")
    local codec=$(extract_codec "$file")
    local size=$(get_formatted_size "$file")
    local has_subs=$(check_subtitles "$file")
    local sub_langs=$(get_subtitle_languages "$file")
    
    # If we weren't able to detect the languages from the file
    if [ -z "$languages" ]; then
        # Try to identify from the filename
        local filename=$(basename "$file")
        languages=$(identify_language "$filename")
        if [ -z "$languages" ]; then
            languages="Unknown"
        fi
    fi
    
    # Format the filename
    local formatted_name="${base_name}"
    
    # Add resolution if available
    if [ -n "$resolution" ]; then
        formatted_name="${formatted_name} [${resolution}"
        
        # Add codec if available
        if [ -n "$codec" ]; then
            formatted_name="${formatted_name} ${codec}"
        fi
        
        formatted_name="${formatted_name}]"
    fi
    
    # Add languages
    if [ -n "$languages" ]; then
        formatted_name="${formatted_name} {${languages}}"
    fi
    
    # Add subtitle info if available
    if [ "$has_subs" = "true" ] && [ -n "$sub_langs" ]; then
        formatted_name="${formatted_name} (SUB: ${sub_langs})"
    fi
    
    # Add size if available
    if [ -n "$size" ]; then
        formatted_name="${formatted_name} [${size}]"
    fi
    
    # Replace problematic characters
    formatted_name=$(echo "$formatted_name" | tr ':' '-' | tr '/' '-' | tr '\' '-' | tr '*' '-' | tr '?' '-' | tr '"' "'" | tr '<' '(' | tr '>' ')' | tr '|' '-')
    
    # Make sure we add the extension
    formatted_name="${formatted_name}.${extension}"
    
    echo "$formatted_name"
}