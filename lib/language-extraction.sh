#!/bin/bash
#
# Media Processor - Language Extraction Module
# This file contains functions for language detection and extraction
# with enhanced support for Malayalam language
#

# Source the configuration and utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

# Function to determine if content is Malayalam or English
identify_language() {
    local filename="$1"
    
    # Check if it has Malayalam in the filename (including [Tam + ... + Mal] format)
    if echo "$filename" | grep -i "Malayalam" > /dev/null || \
       echo "$filename" | grep -i "\[.*Mal.*\]" > /dev/null || \
       echo "$filename" | grep -i "Mal" > /dev/null; then
        echo "malayalam"
    else
        echo "english"
    fi
}

# Function to extract language tracks from a media file
# Returns a comma-separated list of language codes
extract_language_tracks() {
    local file="$1"
    local detected_languages=""
    
    # Skip extraction if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: File not found for language detection: $file"
        return 1
    fi
    
    # Use mkvmerge to get detailed track info for MKV files
    if [ "${file##*.}" = "mkv" ] && command -v mkvmerge >/dev/null 2>&1; then
        local track_info=$(mkvmerge -i "$file" 2>/dev/null)
        local languages=""
        
        # Parse track info to find languages
        while IFS= read -r line; do
            if [[ "$line" == *"audio"* ]]; then
                local track_id=$(echo "$line" | grep -o "Track ID [0-9]*" | cut -d' ' -f3)
                
                # Use mediainfo to get language
                local lang=$(mediainfo "$file" | grep -A 10 "ID.*: $((track_id+1))" | grep "Language" | head -1)
                
                if [[ "$lang" == *"Malayalam"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="mal"
                    else
                        languages="$languages,mal"
                    fi
                elif [[ "$lang" == *"Tamil"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="ta"
                    else
                        languages="$languages,ta"
                    fi
                elif [[ "$lang" == *"Telugu"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="te"
                    else
                        languages="$languages,te"
                    fi
                elif [[ "$lang" == *"Hindi"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="hi"
                    else
                        languages="$languages,hi"
                    fi
                elif [[ "$lang" == *"Kannada"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="kn"
                    else
                        languages="$languages,kn"
                    fi
                elif [[ "$lang" == *"English"* ]]; then
                    if [ -z "$languages" ]; then
                        languages="eng"
                    else
                        languages="$languages,eng"
                    fi
                fi
            fi
        done <<< "$track_info"
        
        if [ -n "$languages" ]; then
            detected_languages="$languages"
            log "MKVMerge detected languages: $detected_languages"
            return 0
        fi
    fi
    
    # Fallback to mediainfo if mkvmerge didn't work
    if command -v mediainfo >/dev/null 2>&1; then
        # Get detailed track info
        local mediainfo_output=$(mediainfo "$file" | grep "Language" | grep -v "Language_More")
        
        # Process each line to get language codes
        local languages=""
        while IFS= read -r line; do
            if [[ "$line" == *"Malayalam"* ]]; then
                if [ -z "$languages" ]; then
                    languages="mal"
                else
                    languages="$languages,mal"
                fi
            elif [[ "$line" == *"Tamil"* ]]; then
                if [ -z "$languages" ]; then
                    languages="ta"
                else
                    languages="$languages,ta"
                fi
            elif [[ "$line" == *"Telugu"* ]]; then
                if [ -z "$languages" ]; then
                    languages="te"
                else
                    languages="$languages,te"
                fi
            elif [[ "$line" == *"Hindi"* ]]; then
                if [ -z "$languages" ]; then
                    languages="hi"
                else
                    languages="$languages,hi"
                fi
            elif [[ "$line" == *"Kannada"* ]]; then
                if [ -z "$languages" ]; then
                    languages="kn"
                else
                    languages="$languages,kn"
                fi
            elif [[ "$line" == *"English"* ]]; then
                if [ -z "$languages" ]; then
                    languages="eng"
                else
                    languages="$languages,eng"
                fi
            fi
        done <<< "$mediainfo_output"
        
        if [ -n "$languages" ]; then
            detected_languages="$languages"
            log "MediaInfo detected languages: $detected_languages"
            return 0
        fi
    elif command -v ffprobe >/dev/null 2>&1; then
        # Extract audio tracks using ffprobe
        local ffprobe_output=$(ffprobe -v error -select_streams a -show_entries stream_tags=language -of default=noprint_wrappers=1:nokey=1 "$file")
        
        # Process each line to get language codes
        local languages=""
        while read -r lang; do
            if [ -n "$lang" ]; then
                if [ -z "$languages" ]; then
                    languages="$lang"
                else
                    languages="$languages,$lang"
                fi
            fi
        done <<< "$ffprobe_output"
        
        if [ -n "$languages" ]; then
            detected_languages="$languages"
            log "FFprobe detected languages: $detected_languages"
            return 0
        fi
    else
        log "WARNING: Neither mediainfo nor ffprobe found, cannot extract language information"
        return 1
    fi
    
    # If we couldn't detect any languages, try to infer from filename
    if [ -z "$detected_languages" ]; then
        local filename=$(basename "$file")
        if identify_language "$filename" == "malayalam"; then
            detected_languages="mal"
            log "Inferred language from filename: $detected_languages"
        fi
    fi
    
    return 0
}

# Function to detect Malayalam audio tracks
# Returns a comma-separated list of track IDs
detect_malayalam_tracks() {
    local file="$1"
    local malayalam_tracks=""
    
    # Skip extraction if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: File not found for Malayalam track detection: $file"
        return 1
    fi
    
    # Use mediainfo to get detailed track info
    local mediainfo_output=$(mediainfo "$file")
    
    # Process each audio track
    local track_id=0
    local in_audio_section=false
    local current_track_id=""
    
    while IFS= read -r line; do
        # Check if we're entering an audio section
        if [[ "$line" == *"Audio"* && "$line" == *"ID"* ]]; then
            in_audio_section=true
            # Extract the track ID
            if [[ "$line" =~ ID[[:space:]]*:[[:space:]]*([0-9]+) ]]; then
                current_track_id="${BASH_REMATCH[1]}"
                # Adjust for 0-based indexing in mkvmerge
                current_track_id=$((current_track_id - 1))
            fi
        fi
        
        # Check if we're leaving an audio section
        if [[ "$in_audio_section" == true && "$line" == "" ]]; then
            in_audio_section=false
            current_track_id=""
        fi
        
        # Check for Malayalam language in the current audio section
        if [[ "$in_audio_section" == true && "$line" == *"Language"* && "$line" == *"Malayalam"* ]]; then
            if [ -z "$malayalam_tracks" ]; then
                malayalam_tracks="$current_track_id"
            else
                malayalam_tracks="$malayalam_tracks,$current_track_id"
            fi
        fi
    done <<< "$mediainfo_output"
    
    # If no Malayalam tracks found, try using mkvmerge
    if [ -z "$malayalam_tracks" ] && [ "${file##*.}" = "mkv" ] && command -v mkvmerge >/dev/null 2>&1; then
        local track_info=$(mkvmerge -i "$file" 2>/dev/null)
        
        while IFS= read -r line; do
            if [[ "$line" == *"audio"* ]]; then
                local track_id=$(echo "$line" | grep -o "Track ID [0-9]*" | cut -d' ' -f3)
                
                if [[ "$line" == *"language:mal"* || "$line" == *"language:ml"* || "$line" == *"language:Malayalam"* ]]; then
                    if [ -z "$malayalam_tracks" ]; then
                        malayalam_tracks="$track_id"
                    else
                        malayalam_tracks="$malayalam_tracks,$track_id"
                    fi
                fi
            fi
        done <<< "$track_info"
    fi
    
    # If still no Malayalam tracks found, try to infer from filename
    if [ -z "$malayalam_tracks" ]; then
        local filename=$(basename "$file")
        if identify_language "$filename" == "malayalam"; then
            # If it's a Malayalam file but no Malayalam tracks detected,
            # use the first audio track
            if [ "${file##*.}" = "mkv" ] && command -v mkvmerge >/dev/null 2>&1; then
                local track_info=$(mkvmerge -i "$file" 2>/dev/null)
                
                # Get the first audio track
                local first_audio=$(echo "$track_info" | grep -m1 "audio" | grep -o "Track ID [0-9]*" | cut -d' ' -f3)
                if [ -n "$first_audio" ]; then
                    malayalam_tracks="$first_audio"
                    log "No Malayalam tracks found, using first audio track: $first_audio"
                fi
            fi
        fi
    fi
    
    echo "$malayalam_tracks"
}

# Function to detect English subtitle tracks
# Returns a comma-separated list of track IDs
detect_english_subtitle_tracks() {
    local file="$1"
    local english_subs=""
    
    # Skip extraction if file doesn't exist
    if [ ! -f "$file" ]; then
        log "ERROR: File not found for subtitle detection: $file"
        return 1
    fi
    
    # Use mediainfo to get detailed track info
    local mediainfo_output=$(mediainfo "$file")
    
    # Process each subtitle track
    local track_id=0
    local in_text_section=false
    local current_track_id=""
    
    while IFS= read -r line; do
        # Check if we're entering a text/subtitle section
        if [[ "$line" == *"Text"* && "$line" == *"ID"* ]]; then
            in_text_section=true
            # Extract the track ID
            if [[ "$line" =~ ID[[:space:]]*:[[:space:]]*([0-9]+) ]]; then
                current_track_id="${BASH_REMATCH[1]}"
                # Adjust for 0-based indexing in mkvmerge
                current_track_id=$((current_track_id - 1))
            fi
        fi
        
        # Check if we're leaving a text section
        if [[ "$in_text_section" == true && "$line" == "" ]]; then
            in_text_section=false
            current_track_id=""
        fi
        
        # Check for English language in the current text section
        if [[ "$in_text_section" == true && "$line" == *"Language"* && "$line" == *"English"* ]]; then
            if [ -z "$english_subs" ]; then
                english_subs="$current_track_id"
            else
                english_subs="$english_subs,$current_track_id"
            fi
        fi
    done <<< "$mediainfo_output"
    
    # If no English subs found, try using mkvmerge
    if [ -z "$english_subs" ] && [ "${file##*.}" = "mkv" ] && command -v mkvmerge >/dev/null 2>&1; then
        local track_info=$(mkvmerge -i "$file" 2>/dev/null)
        
        while IFS= read -r line; do
            if [[ "$line" == *"subtitles"* ]]; then
                local track_id=$(echo "$line" | grep -o "Track ID [0-9]*" | cut -d' ' -f3)
                
                if [[ "$line" == *"language:eng"* || "$line" == *"language:en"* || "$line" == *"language:English"* ]]; then
                    if [ -z "$english_subs" ]; then
                        english_subs="$track_id"
                    else
                        english_subs="$english_subs,$track_id"
                    fi
                fi
            fi
        done <<< "$track_info"
    fi
    
    # If still no English subs found, try to get any subtitle track
    if [ -z "$english_subs" ] && [ "${file##*.}" = "mkv" ] && command -v mkvmerge >/dev/null 2>&1; then
        local track_info=$(mkvmerge -i "$file" 2>/dev/null)
        
        # Get the first subtitle track
        local first_sub=$(echo "$track_info" | grep -m1 "subtitles" | grep -o "Track ID [0-9]*" | cut -d' ' -f3)
        if [ -n "$first_sub" ]; then
            english_subs="$first_sub"
            log "No English subtitle tracks found, using first subtitle track: $first_sub"
        fi
    fi
    
    echo "$english_subs"
}

# Function to clean filename by removing language tags
clean_language_tags() {
    local filename="$1"
    
    # Remove language tags like [Tam + Tel + Hin + Mal + Kan]
    local cleaned=$(echo "$filename" | sed -E 's/\[Tam \+ Tel \+ Hin \+ Mal \+ Kan\]//g')
    cleaned=$(echo "$cleaned" | sed -E 's/\[.*Mal.*\]//g')
    
    # Remove extra spaces
    cleaned=$(echo "$cleaned" | sed -E 's/\s+/ /g' | sed -E 's/^\s+|\s+$//g')
    
    echo "$cleaned"
}

# Function to extract Malayalam audio tracks from MKV file
# Returns the path to the new file with only Malayalam audio
extract_malayalam_audio() {
    local file="$1"
    local output_file=""
    
    # Skip if not an MKV file
    if [[ "${file##*.}" != "mkv" ]]; then
        log "Not an MKV file, skipping Malayalam audio extraction: $(basename "$file")"
        return 1
    fi
    
    # Check for required tools
    if ! command -v mkvmerge >/dev/null 2>&1; then
        log "mkvmerge not found, cannot extract tracks from MKV - using original file"
        return 1
    fi
    
    # Detect Malayalam tracks
    local malayalam_tracks=$(detect_malayalam_tracks "$file")
    
    if [ -z "$malayalam_tracks" ]; then
        log "No Malayalam audio tracks found in: $(basename "$file")"
        return 1
    fi
    
    log "Found Malayalam audio tracks: $malayalam_tracks"
    
    # Detect English subtitle tracks
    local english_subs=$(detect_english_subtitle_tracks "$file")
    
    if [ -n "$english_subs" ]; then
        log "Found English subtitle tracks: $english_subs"
    else
        log "No English subtitle tracks found"
    fi
    
    # Create a temporary directory for processing
    local temp_dir=$(mktemp -d)
    local temp_file="$temp_dir/$(basename "$file")"
    
    # Build mkvmerge command for extraction
    local mkvmerge_cmd="mkvmerge -o \"$temp_file\" "
    
    # Add video tracks (all of them)
    mkvmerge_cmd+="--video-tracks all "
    
    # Add only Malayalam audio tracks
    mkvmerge_cmd+="--audio-tracks $malayalam_tracks "
    
    # Add subtitle tracks if found
    if [ -n "$english_subs" ]; then
        mkvmerge_cmd+="--subtitle-tracks $english_subs "
    else
        mkvmerge_cmd+="--no-subtitles "
    fi
    
    # Add the input file
    mkvmerge_cmd+="--no-chapters \"$file\""
    
    log "Running MKVMerge command: $mkvmerge_cmd"
    eval $mkvmerge_cmd
    
    if [ $? -eq 0 ] && [ -f "$temp_file" ]; then
        log "Successfully extracted Malayalam audio to: $temp_file"
        output_file="$temp_file"
        return 0
    else
        log "ERROR: Failed to extract Malayalam audio, using original file"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Function to process a media file for language extraction
process_language_extraction() {
    local file="$1"
    local language="$2"
    local file_extension="${file##*.}"
    local file_extension_lower=$(echo "$file_extension" | tr '[:upper:]' '[:lower:]')
    
    # Skip if not a video file
    if ! [[ "$file_extension_lower" =~ ^(mkv|mp4|avi|m4v|mov)$ ]]; then
        log "Not a video file, skipping language extraction: $(basename "$file")"
        return 1
    fi
    
    # Skip if not Malayalam or extraction is disabled
    if [ "$language" != "malayalam" ] || [ "$EXTRACT_AUDIO_TRACKS" != "true" ]; then
        log "Skipping language extraction for: $(basename "$file")"
        return 1
    fi
    
    # For MKV files, try to extract Malayalam audio
    if [ "$file_extension_lower" = "mkv" ]; then
        log "Attempting to extract Malayalam audio from: $(basename "$file")"
        
        # Clean the filename by removing language tags
        local clean_filename=$(clean_language_tags "$(basename "$file")")
        log "Cleaned filename (removed language tags): $clean_filename"
        
        # Create a temporary file with the cleaned name
        local temp_dir=$(mktemp -d)
        local temp_file="$temp_dir/$clean_filename"
        cp "$file" "$temp_file"
        
        # Extract Malayalam audio
        local extracted_file=""
        extracted_file=$(extract_malayalam_audio "$temp_file")
        local extraction_status=$?
        
        # Clean up the temporary file
        rm -f "$temp_file"
        
        if [ $extraction_status -eq 0 ] && [ -f "$extracted_file" ]; then
            log "Successfully extracted Malayalam audio to: $(basename "$extracted_file")"
            echo "$extracted_file"
            return 0
        else
            log "No Malayalam audio extracted, using original file"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        log "Not an MKV file, skipping Malayalam audio extraction: $(basename "$file")"
        return 1
    fi
}