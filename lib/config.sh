#!/bin/bash
#
# Media Processor Configuration File
# This file contains all configurable settings for the Media Processor

# Source directory - where JDownloader saves files
SOURCE_DIR="/home/sharvinzlife/Documents/JDownloader/"

# Logging configuration
LOG_FILE="/home/sharvinzlife/media-processor.log"
LOG_LEVEL="INFO"  # Options: DEBUG, INFO, WARNING, ERROR

# SMB connection settings
SMB_SERVER="streamwave.local"
SMB_SHARE="Data-Streamwave"

# SMB credentials
# For better security, consider using environment variables or a .env file
SMB_USER="sharvinzlife"
SMB_PASSWORD='Tkrw%S$!H2rAPC6x'
SMB_AUTH_METHOD="user"  # Options: user, anonymous

# Processing options
DRY_RUN=false           # Set to true to test without copying or deleting files
OVERWRITE_EXISTING=false # Set to true to overwrite existing files in destination
VERBOSE_OUTPUT=false     # Set to true for more detailed output

# Media paths - relative to SMB share root
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"
DEFAULT_MEDIA_PATH="media"

# Language extraction settings
EXTRACT_AUDIO_TRACKS=true        # Extract specific language audio tracks
EXTRACT_SUBTITLES=true           # Extract subtitles
PREFERRED_LANGUAGE="mal"         # Primary preferred language 
PREFERRED_AUDIO_LANGS="mal,eng"  # Preferred audio languages (comma separated)
PREFERRED_SUBTITLE_LANGS="eng"   # Preferred subtitle languages (comma separated)

# Cleanup configuration
CLEANUP_RAR_FILES=true
CLEANUP_EMPTY_DIRS=true
CLEAN_ORIGINAL_FILES=true      # Set to true to delete original files after successful transfer
MIN_RAR_AGE_HOURS=0            # Set to 0 for immediate cleanup after processing

# Advanced settings
TEMP_DIR="/tmp/media-processor"  # Temporary directory for processing
MAX_CONCURRENT_TRANSFERS=2       # Maximum number of concurrent file transfers
RETRY_COUNT=3                    # Number of retries for failed operations
RETRY_DELAY=5                    # Delay in seconds between retries

# Dashboard API configuration
DASHBOARD_API_ENABLED=true                 # Enable/disable dashboard API integration
DASHBOARD_API_URL="http://localhost:3001"  # URL for the dashboard API
DASHBOARD_API_TIMEOUT=5                    # Timeout in seconds for API requests

# Load environment-specific overrides if they exist
if [ -f "${HOME}/.media-processor.env" ]; then
    source "${HOME}/.media-processor.env"
fi

# Load local overrides if they exist (for development)
if [ -f "$(dirname "$0")/../.env.local" ]; then
    source "$(dirname "$0")/../.env.local"
fi