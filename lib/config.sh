#!/bin/bash
#
# Media Processor - Configuration Module
# This file contains all configuration variables for the Media Processor system
#

# Base directories
SOURCE_DIR=/home/sharvinzlife/Documents/JDownloader/
LOG_FILE="/home/sharvinzlife/media-processor.log"

# SMB connection settings
SMB_SERVER="streamwave.local"
SMB_SHARE="Data-Streamwave"
SMB_USER="sharvinzlife"
SMB_PASSWORD="Tkrw%S\$!H2rAPC6x"
SMB_AUTH_METHOD="user"  # Options: user, anonymous

# Operation modes
DRY_RUN=false  # Set to true to test without copying or deleting files
OVERWRITE_EXISTING=false  # Set to true to overwrite existing files in destination

# Media paths
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
MIN_RAR_AGE_HOURS=0             # Set to 0 for immediate cleanup after processing

# Global variables
SMB_CONNECTED=false  # Will be set to true if SMB connection is successful