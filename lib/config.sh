#!/bin/bash
#
# Media Processor Configuration File
# This file loads configuration from .env file for consistency across all components

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Export all variables from .env file
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
else
    echo "Warning: .env file not found at $PROJECT_ROOT/.env"
    echo "Using fallback configuration values"
    
    # Fallback values if .env file is missing
    SOURCE_DIR="/home/sharvinzlife/Documents/JDownloader/"
    LOG_FILE="/home/sharvinzlife/media-processor.log"
    LOG_LEVEL="INFO"
    SMB_SERVER="streamwave.local"
    SMB_SHARE="Data-Streamwave"
    SMB_USERNAME="sharvinzlife"
    SMB_PASSWORD='Tkrw%S$!H2rAPC6x'
    SMB_AUTH_METHOD="user"
    DRY_RUN=false
    OVERWRITE_EXISTING=false
    VERBOSE_OUTPUT=false
    MALAYALAM_MOVIE_PATH="media/malayalam movies"
    MALAYALAM_TV_PATH="media/malayalam-tv-shows"
    ENGLISH_MOVIE_PATH="media/movies"
    ENGLISH_TV_PATH="media/tv-shows"
    DEFAULT_MEDIA_PATH="media"
    EXTRACT_AUDIO_TRACKS=true
    EXTRACT_SUBTITLES=true
    PREFERRED_LANGUAGE="mal"
    PREFERRED_AUDIO_LANGS="mal,eng"
    PREFERRED_SUBTITLE_LANGS="eng"
    CLEANUP_RAR_FILES=true
    CLEANUP_EMPTY_DIRS=true
    CLEAN_ORIGINAL_FILES=true
    MIN_RAR_AGE_HOURS=0
    TEMP_DIR="/tmp/media-processor"
    MAX_CONCURRENT_TRANSFERS=2
    RETRY_COUNT=3
    RETRY_DELAY=5
    DASHBOARD_API_ENABLED=true
    DASHBOARD_API_URL="http://localhost:3001"
    DASHBOARD_API_TIMEOUT=5
fi

# Map environment variable names to legacy bash variable names for backward compatibility
SMB_USER="$SMB_USERNAME"  # Map SMB_USERNAME to legacy SMB_USER variable

# Load environment-specific overrides if they exist
if [ -f "${HOME}/.media-processor.env" ]; then
    source "${HOME}/.media-processor.env"
fi

# Load local overrides if they exist (for development)
if [ -f "$(dirname "$0")/../.env.local" ]; then
    source "$(dirname "$0")/../.env.local"
fi