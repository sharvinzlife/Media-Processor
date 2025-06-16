#!/usr/bin/env python3

import os
import sys
import subprocess
import shutil
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

# Add modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

# Import modular components
from config.settings import ConfigManager
from utils.logging_setup import setup_logging, get_logger
from utils.file_history import FileHistoryManager
from api.dashboard_client import DashboardApiClient
from media.detector import MediaDetector

try:
    from pymediainfo import MediaInfo
except ImportError:
    print("pymediainfo not found. Please install it: pip install pymediainfo")
    sys.exit(1)

# Global logger
logger = get_logger("MediaProcessor")


class MediaProcessor:
    """Main class for media processing operations"""
    
    def __init__(self, config_path: str = "/etc/media-processor/config.json"):
        """Initialize the media processor with configuration"""
        # Initialize modular components
        self.config_manager = ConfigManager(config_path)
        self.config = self.config_manager.get_config()
        
        # Initialize file history manager
        self.file_history = FileHistoryManager()
        
        # Initialize media detector
        self.media_detector = MediaDetector()
        
        # Initialize API client
        self.api_client = DashboardApiClient(
            self.config.get("dashboard_api_url", "http://localhost:5000"), 
            self.config.get("dashboard_api_enabled", True)
        )
        
        # Setup SMB connection parameters
        smb_user = self.config.get("smb_username")
        smb_password = self.config.get("smb_password")
        smb_server = self.config.get("smb_server")
        
        # Store SMB connection parameters for later use
        self.smb_params = {
            'username': smb_user,
            'password': smb_password, 
            'server': smb_server
        }
        
        logger.info(f"SMB client initialized with username: {smb_user} and server: {smb_server}")
        



    def _get_media_info(self, filepath: str) -> Optional[MediaInfo]:
        """Parse media file and return MediaInfo object."""
        try:
            logger.debug(f"Parsing media info for: {filepath}")
            media_info = MediaInfo.parse(filepath)
            return media_info
        except Exception as e:
            logger.error(f"Error parsing media info for {filepath} with pymediainfo: {e}")
            # Attempt to get basic info if parsing fails, e.g. for non-media files
            if "Does not look like a supported media file" in str(e):
                 logger.warning(f"{filepath} might not be a media file or is unsupported by MediaInfo.")
            return None

    def detect_media_attributes(self, filepath: str) -> Tuple[str, str, str, List[str]]:
        """
        Detect media type, language, resolution, and subtitle languages.
        Returns:
            Tuple of (media_type, language, resolution_tag, subtitle_langs_list)
        """
        filename = os.path.basename(filepath).lower()
        media_info = self._get_media_info(filepath)

        # Defaults
        resolution_tag = ""
        subtitle_langs_list = []

        # 1. Media Type Detection using media detector
        media_type = self.media_detector.detect_media_type(filepath)

        # 2. Language Detection using media detector
        language, needs_extraction = self.media_detector.detect_language_from_audio_tracks(filepath)


        # 3. Resolution Detection (MediaInfo first, then filename)
        if media_info and media_info.video_tracks:
            video_track = media_info.video_tracks[0]
            if video_track.width and video_track.height:
                if video_track.width >= 3800 or video_track.height >= 2100: # Approximation for 4K
                    resolution_tag = "2160p"
                elif video_track.width >= 1900 or video_track.height >= 1000: # Approximation for 1080p
                    resolution_tag = "1080p"
                elif video_track.width >= 1200 or video_track.height >= 700: # Approximation for 720p
                    resolution_tag = "720p"
                elif video_track.width >= 600 or video_track.height >= 400: # Approximation for SD
                    resolution_tag = "480p" # or SD
        
        if not resolution_tag: # Filename fallback for resolution
            if "2160p" in filename or "4k" in filename: resolution_tag = "2160p"
            elif "1080p" in filename: resolution_tag = "1080p"
            elif "720p" in filename: resolution_tag = "720p"
            elif "480p" in filename: resolution_tag = "480p"

        # 4. Subtitle Detection (MediaInfo)
        if media_info and media_info.text_tracks:
            for track in media_info.text_tracks:
                if track.language:
                    subtitle_langs_list.append(str(track.language).lower())
            subtitle_langs_list = sorted(list(set(subtitle_langs_list))) # Unique, sorted

        logger.info(f"Detected attributes for {filepath}: Type={media_type}, Lang={language}, Res={resolution_tag or 'N/A'}, Subs={subtitle_langs_list or 'None'}")
        return media_type, language, resolution_tag, subtitle_langs_list

    def process_file(self, filepath: str, dry_run: bool = False) -> bool:
        """Process a media file and move it to the appropriate location"""
        if not os.path.exists(filepath):
            logger.error(f"File not found: {filepath}")
            return False
            
        # Get file size
        size_bytes = os.path.getsize(filepath)
        
        # Detect media attributes
        media_type, language, resolution_tag, subtitle_langs = self.detect_media_attributes(filepath)
        
        file_to_process = filepath # Start with the original file
        extraction_temp_file = None

        if self.config.get("extract_audio_tracks") and language == "malayalam": # Condition for extraction
            logger.info(f"Attempting track extraction for Malayalam file: {filepath}")
            # Define preferred tracks, e.g., Malayalam audio, English subtitles
            # These could also come from config
            preferred_audio_lang = self.config.get("preferred_language_code", "mal") 
            preferred_subtitle_lang = "eng" # Example

            extraction_temp_file = self._extract_preferred_tracks(
                filepath, 
                preferred_audio_lang, 
                preferred_subtitle_lang
            )
            if extraction_temp_file == filepath:
                # No extraction needed, processing original file
                logger.info(f"No preferred tracks found for extraction. Processing original: {filepath}")
                file_to_process = filepath
            elif extraction_temp_file and os.path.exists(extraction_temp_file):
                logger.info(f"Track extraction successful. New file to process: {extraction_temp_file}")
                file_to_process = extraction_temp_file
                # Update size_bytes if file has changed
                size_bytes = os.path.getsize(file_to_process)
                self.api_client.update_dashboard_api(
                    "extractionSuccess", filepath, extraction_temp_file, media_type, language, size_bytes
                )
            else:
                logger.warning(f"Track extraction failed or produced no file. Processing original: {filepath}")
                self.api_client.update_dashboard_api(
                    "extractionFailed", filepath, "Extraction Error", media_type, language, size_bytes, "Track extraction failed"
                )
                # file_to_process remains the original filepath

        # Determine target path
        target_base_path = self._get_target_base_path(media_type, language)
        if not target_base_path:
            logger.error(f"Could not determine target base path for {filepath}")
            self.api_client.update_dashboard_api(
                "transferFailed", filepath, "Unknown Target", media_type, language, size_bytes, "Unknown target path"
            )
            return False

        # Format final filename and determine full target path on share
        # Use file_to_process (which might be the extracted file) for formatting context if needed,
        # but original_filepath for historical/logging context if preferred.
        # Here, original_filepath is better for consistent naming based on original,
        # while file_to_process is the actual content being moved.
        final_filename, target_path_on_share = self._format_final_filename_and_path(
            original_filepath=filepath, # Use original for naming context
            media_type=media_type, 
            language=language, 
            resolution_tag=resolution_tag, 
            target_base_dir_on_share=target_base_path,
            current_file_ext=os.path.splitext(file_to_process)[1] # Use extension of actual file being processed
        )
        if not final_filename or not target_path_on_share:
            logger.error(f"Could not format final filename or path for {file_to_process} (original: {filepath})")
            self.api_client.update_dashboard_api(
                "transferFailed", file_to_process, "Filename/Path Error", media_type, language, size_bytes, "Filename formatting/path error"
            )
            if extraction_temp_file and os.path.exists(extraction_temp_file): # Cleanup temp extracted file
                logger.info(f"Cleaning up temporary extraction file: {extraction_temp_file}")
                try: os.remove(extraction_temp_file)
                except OSError as e_rm: logger.error(f"Error removing temp extraction file {extraction_temp_file}: {e_rm}")
            return False
        
        # Notify dashboard API of transfer start (using file_to_process as source)
        self.api_client.update_dashboard_api(
            "transferStart", 
            file_to_process, # This is the file we are about to transfer
            target_path_on_share, 
            media_type, 
            language, 
            size_bytes
        )
        
        if dry_run:
            logger.info(f"DRY RUN: Would transfer {file_to_process} to {target_path_on_share} (on SMB share {self.config.get('smb_share')})")
            self.api_client.update_dashboard_api(
                "dryRun", 
                file_to_process, 
                target_path_on_share, 
                media_type, 
                language, 
                size_bytes
            )
            if extraction_temp_file and os.path.exists(extraction_temp_file): # Cleanup temp extracted file even on dry run
                logger.info(f"DRY RUN: Would clean up temporary extraction file: {extraction_temp_file}")
                # In a real dry run, you might not delete, or have a flag. For now, let's assume cleanup.
                try: os.remove(extraction_temp_file)
                except OSError as e_rm: logger.error(f"DRY RUN: Error removing temp extraction file {extraction_temp_file}: {e_rm}")
            return True
            
        success = self._transfer_file(file_to_process, target_path_on_share)
        
        # Update dashboard API with result
        status_event = "transferSuccess" if success else "transferFailed"
        error_message = None if success else f"SMB transfer of {file_to_process} to {target_path_on_share} failed."
        self.api_client.update_dashboard_api(
            status_event,
            file_to_process, 
            target_path_on_share, 
            media_type, 
            language, 
            size_bytes,
            error_message
        )

        if success:
            # Clean up original file if clean_original_files is enabled
            if self.config.get("clean_original_files", False):
                # If extraction happened, clean up the original file
                if file_to_process != filepath:
                    logger.info(f"Transfer successful. Cleaning up original file after extraction: {filepath}")
                    try:
                        os.remove(filepath)
                    except OSError as e:
                        logger.error(f"Failed to remove original file {filepath} after successful extraction and transfer: {e}")
                # If no extraction happened, clean up the source file that was transferred
                else:
                    logger.info(f"Transfer successful. Cleaning up source file: {filepath}")
                    try:
                        os.remove(filepath)
                    except OSError as e:
                        logger.error(f"Failed to remove source file {filepath} after successful transfer: {e}")
        
        # Clean up temporary extracted file if it exists and is different from original (it's temporary)
        if extraction_temp_file and extraction_temp_file != filepath and os.path.exists(extraction_temp_file):
            logger.info(f"Cleaning up temporary extraction file: {extraction_temp_file}")
            try:
                os.remove(extraction_temp_file)
            except OSError as e_rm:
                logger.error(f"Error removing temp extraction file {extraction_temp_file}: {e_rm}")
        
        return success
    
    def _get_target_base_path(self, media_type: str, language: str) -> Optional[str]:
        """Determine the base target path on the SMB share based on media type and language."""
        if media_type == "movie":
            if language == "english":
                return self.config.get("english_movies_path")
            elif language == "malayalam": # Assuming preferred_lang_code 'mal' means malayalam
                return self.config.get("malayalam_movies_path")
        elif media_type == "tvshow":
            if language == "english":
                return self.config.get("english_tv_path")
            elif language == "malayalam": # Assuming preferred_lang_code 'mal' means malayalam
                return self.config.get("malayalam_tv_path")
        
        logger.warning(f"No target path configured for media_type='{media_type}', language='{language}'")
        # if not target_path: # This check seems redundant as target_path is not defined in this scope.
        # The variable target_base_path is what's returned from this function.
        # If target_base_path is None, it's handled in process_file.
        return None # Fallback if no specific path is found

    def _clean_filename_basic(self, filename: str) -> str:
        """Enhanced filename cleaning to extract proper movie titles."""
        name_part, ext_part = os.path.splitext(filename)
        original_name = name_part
        
        # Extract year to preserve it (will be added back later if not in final title)
        year_match = re.search(r'\((\d{4})\)', name_part)
        year_value = year_match.group(1) if year_match else None
        
        # Remove website prefixes more aggressively
        # Handle TamilMV patterns (www.1TamilMV.boo, www 2TamilMV com, www 1TamilMV org, etc.)
        # Fixed pattern to handle single dots correctly
        name_part = re.sub(r'^www[\s.]*\d*\s*tamilmv[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
        # Handle specific pattern: "www 1TamilMV org -"
        name_part = re.sub(r'^www\s+\d+tamilmv\s+org\s*-\s*', '', name_part, flags=re.IGNORECASE)
        # Handle sanet.st and similar patterns
        name_part = re.sub(r'^sanet[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
        # General website patterns (www.site.com - )
        name_part = re.sub(r'^www\.\w+\.\w+\s*-\s*', '', name_part, flags=re.IGNORECASE)
        name_part = re.sub(r'^www\s+\w+\s+\w+\s*-\s*', '', name_part, flags=re.IGNORECASE)  # Handle spaces in domain
        # Remove any bracketed website names at the beginning
        name_part = re.sub(r'^\[\s*(?:www[\s.]*)?\w*(?:tamilmv|sanet)[\s.]*\w*\s*\]\s*', '', name_part, flags=re.IGNORECASE)
        # Remove website names without www prefix
        name_part = re.sub(r'^\d*\s*tamilmv[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
        
        # Extract movie title before technical details
        # Look for patterns that typically separate title from technical info
        title_separators = [
            r'\s+-\s+(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip)',  # " - TRUE WEB-DL"
            r'\s+(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip)',      # " TRUE WEB-DL"
            r'\s+-\s+\d+p',  # " - 1080p"
            r'\s+\d+p',      # " 1080p"
        ]
        
        for separator in title_separators:
            match = re.search(separator, name_part, flags=re.IGNORECASE)
            if match:
                name_part = name_part[:match.start()].strip()
                break
        
        # Remove common junk patterns
        junk_patterns = [
            r'\[.*?\]',  # Content in square brackets
            r'\bHQ\b',   # HQ quality indicator
            r'\b(x264|x265|AVC|HEVC)\b',  # Video codecs
            r'\b(DD\+?[\d.]+|DTS|AAC)\b',  # Audio codecs
            r'\b\d+Kbps\b',  # Bitrate info
            r'\b\d+\.?\d*GB\b',  # File size
            r'\bESub\b',  # Subtitle indicator
            # Remove website patterns that appear anywhere in the filename
            r'\b\d*\s*tamilmv[\s.]*\w*\b',  # TamilMV patterns
            r'\bsanet[\s.]*\w*\b',  # sanet.st patterns
            r'\s+-\s+.*$',  # Everything after " - " at the end
        ]
        
        for pattern in junk_patterns:
            name_part = re.sub(pattern, '', name_part, flags=re.IGNORECASE)
        
        # Clean up spaces and dots
        name_part = name_part.replace('.', ' ').strip()
        name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # Remove any remaining parentheses that don't contain a 4-digit year
        name_part = re.sub(r'\((?!\d{4})[^)]*\)', '', name_part).strip()
        name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # If we ended up with something too short or empty, fall back to original
        if len(name_part) < 3:
            name_part = original_name
            # Apply the same website cleaning patterns with fixed regex
            name_part = re.sub(r'^www[\s.]*\d*\s*tamilmv[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
            name_part = re.sub(r'^sanet[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
            name_part = re.sub(r'^www\.\w+\.\w+\s*-\s*', '', name_part, flags=re.IGNORECASE)
            name_part = re.sub(r'^\[\s*(?:www[\s.]*)?\w*(?:tamilmv|sanet)[\s.]*\w*\s*\]\s*', '', name_part, flags=re.IGNORECASE)
            name_part = re.sub(r'^\d*\s*tamilmv[\s.]*\w*\s*-\s*', '', name_part, flags=re.IGNORECASE)
            name_part = name_part.replace('.', ' ').strip()
            name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # Add year back if it's not already in the final name and we found one
        if year_value and f"({year_value})" not in name_part:
            name_part = f"{name_part} ({year_value})"
        
        return f"{name_part}{ext_part}" if name_part else filename


    def _extract_series_name_and_episode(self, filename: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Extracts series name, season number, and episode number from filename."""
        original_name_part, ext = os.path.splitext(filename)
        
        # First clean the filename to remove website prefixes and junk
        # Handle TamilMV patterns more precisely to avoid over-removal
        # Pattern: "www.1TamilMV.boo - Rana Naidu S02E04..." -> "Rana Naidu S02E04..."
        cleaned_name = re.sub(r'^www\.\d*TamilMV\.[a-z]+\s*-\s*', '', original_name_part, flags=re.IGNORECASE)
        # Pattern: "www 1TamilMV org - " 
        cleaned_name = re.sub(r'^www\s+\d*TamilMV\s+[a-z]+\s*-\s*', '', cleaned_name, flags=re.IGNORECASE)
        # Handle sanet.st and similar patterns
        cleaned_name = re.sub(r'^sanet[\s.]*\w*\s*-\s*', '', cleaned_name, flags=re.IGNORECASE)
        # General website patterns
        cleaned_name = re.sub(r'^www\.\w+\.\w+\s*-\s*', '', cleaned_name, flags=re.IGNORECASE)
        cleaned_name = re.sub(r'^www\s+\w+\s+\w+\s*-\s*', '', cleaned_name, flags=re.IGNORECASE)
        # Remove any bracketed website names at the beginning
        cleaned_name = re.sub(r'^\[\s*(?:www[\s.]*)?\w*(?:tamilmv|sanet)[\s.]*\w*\s*\]\s*', '', cleaned_name, flags=re.IGNORECASE)
        # Remove remaining "www.xxx -" patterns that might be left
        cleaned_name = re.sub(r'^www\.\w+\s*-\s*', '', cleaned_name, flags=re.IGNORECASE)
        cleaned_name = cleaned_name.replace('.', ' ').strip()
        
        logger.info(f"Original filename part: '{original_name_part}'")
        logger.info(f"Cleaned filename for parsing: '{cleaned_name}'")
        
        # Enhanced patterns for TV shows including non-standard formats
        patterns = [
            # Standard S01E01 format: "Rana Naidu S02E06 Two Faced" -> ("Rana Naidu", "02", "06")
            r'^(.*?)\s+[Ss](\d{1,2})[Ee](\d{1,2})(?:\s+(.*))?$',
            # More flexible S01E01 format with optional separators
            r'^(.*?)\s+[Ss](\d{1,2})[EeXx](\d{1,2})(?:\s+(.*))?$',
            # Episode names with season/episode: "Show Name Season 1 Episode 1"
            r'^(.*?)\s+Season[\s._]*(\d{1,2})[\s._]*Episode[\s._]*(\d{1,2})(?:\s+(.*))?$',
            # Format like "Show Name 1x01"
            r'^(.*?)\s+(\d{1,2})[xX](\d{1,2})(?:\s+(.*))?$',
            # Three digit episode format: "Show Name 201" (S2E01)
            r'^(.*?)\s+(\d)(\d{2})(?:\s+(.*))?$',
            # Flexible pattern for episode titles: "Show Name S02E02 Title"
            r'^(.*?)\s+[Ss](\d{1,2})[Ee](\d{1,2})\s+(.+)$',
        ]

        logger.info(f"Attempting to parse TV show: '{cleaned_name}'")
        
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, cleaned_name, re.IGNORECASE)
            if match:
                logger.info(f"TV show pattern {i+1} matched: {match.groups()}")
                series_name = match.group(1).strip()
                season_num = match.group(2).zfill(2) # Pad with zero if single digit
                episode_num = match.group(3).zfill(2) # Pad with zero if single digit
                episode_title = match.group(4).strip() if len(match.groups()) > 3 and match.group(4) else None
                
                # Clean series name further
                series_name = re.sub(r'[\s._-]+$', '', series_name)
                series_name = re.sub(r'\s*\(\d{4}\)$', '', series_name).strip()
                series_name = re.sub(r'\s*\d{4}$', '', series_name).strip()
                
                # Apply basic cleaning to series name to remove any remaining junk
                series_name = self._clean_filename_basic(series_name + ".temp").replace(".temp", "")

                logger.info(f"Extracted TV show info: Series='{series_name}', Season={season_num}, Episode={episode_num}")
                return series_name, season_num, episode_num
            
        logger.info(f"No TV show pattern matched for: '{cleaned_name}' - using fallback logic")
        
        # Fallback: treat as series name without episode info
        return self._clean_filename_basic(original_name_part).replace(os.path.splitext(original_name_part)[1], ''), None, None

    def _format_final_filename_and_path(self, original_filepath: str, media_type: str, language: str, 
                                       resolution_tag: str, target_base_dir_on_share: str, current_file_ext: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Formats the final filename and constructs the full target path on the SMB share.
        `current_file_ext` is the extension of the file being processed (could be .mkv after extraction).
        """
        original_filename_for_naming = os.path.basename(original_filepath) # Use original for consistent naming base
        name_part_for_naming, _ = os.path.splitext(original_filename_for_naming)


        final_name_part = ""
        target_path_on_share = "" # This will be relative to the share root

        if media_type == "tvshow":
            series_name, season_num, episode_num = self._extract_series_name_and_episode(name_part_for_naming)
            if series_name and season_num and episode_num:
                series_name_cleaned = re.sub(r'[\s._-]+$', '', series_name.replace('.', ' ').strip())
                series_name_cleaned = re.sub(r'\s+', ' ', series_name_cleaned).strip()

                final_name_part = f"{series_name_cleaned} - S{season_num}E{episode_num}"
                season_folder = f"Season {season_num.lstrip('0')}"
                
                # Path: BaseTVPath/SeriesName/Season X/Series.Name.S01E01 [Tags].ext
                # Tags (resolution, language) will be added to final_name_part later
                target_path_on_share = os.path.join(target_base_dir_on_share, series_name_cleaned, season_folder, f"{final_name_part}{current_file_ext}")
            else: 
                # Fallback: Try to extract a series name for better organization
                # Remove common patterns and try to group episodes under a series folder
                cleaned_name = self._clean_filename_basic(name_part_for_naming)
                
                # Try to extract a series name by removing obvious episode indicators
                series_name_guess = cleaned_name
                season_guess = None
                episode_guess = None
                
                # Remove common episode patterns that might not have been caught
                series_name_guess = re.sub(r'\s+Episode\s+\d+.*$', '', series_name_guess, flags=re.IGNORECASE)
                series_name_guess = re.sub(r'\s+Ep\s*\d+.*$', '', series_name_guess, flags=re.IGNORECASE)
                series_name_guess = re.sub(r'\s+E\d+.*$', '', series_name_guess, flags=re.IGNORECASE)
                series_name_guess = re.sub(r'\s+Part\s+\d+.*$', '', series_name_guess, flags=re.IGNORECASE)
                series_name_guess = re.sub(r'\s+S\d+.*$', '', series_name_guess, flags=re.IGNORECASE)  # Remove season info
                series_name_guess = re.sub(r'\s+\d{1,3}$', '', series_name_guess)  # Remove trailing numbers
                
                # Also try to extract series name by looking for common episode title patterns
                # e.g., "Rana Naidu S02E02 Feral Wild Dog" -> "Rana Naidu"
                title_match = re.match(r'^(.*?)\s+[Ss](\d+)[Ee](\d+)\s+.*$', cleaned_name, re.IGNORECASE)
                if title_match:
                    series_name_guess = title_match.group(1).strip()
                    season_guess = title_match.group(2).zfill(2)  # Extract season number
                    episode_guess = title_match.group(3).zfill(2)  # Extract episode number
                    # Clean up any remaining website artifacts from the series name
                    series_name_guess = re.sub(r'^www\.\w+\s*-?\s*', '', series_name_guess, flags=re.IGNORECASE)
                    series_name_guess = series_name_guess.strip()
                    logger.info(f"Extracted series name from S##E## pattern: '{series_name_guess}', Season: {season_guess}, Episode: {episode_guess}")
                
                # If we can extract a reasonable series name, use it
                if len(series_name_guess.strip()) > 3 and series_name_guess.strip() != cleaned_name:
                    series_folder = series_name_guess.strip()
                    # Clean the final filename to remove website prefixes
                    final_name_part = cleaned_name
                    final_name_part = re.sub(r'^www\.\w+\s*-\s*', '', final_name_part, flags=re.IGNORECASE)
                    final_name_part = final_name_part.strip()
                    
                    # Use detected season number if available, otherwise default to Season 1
                    if season_guess:
                        season_folder = f"Season {int(season_guess)}"  # Remove leading zero for display
                    else:
                        season_folder = "Season 1"
                    
                    # Place in: SeriesName/Season X/filename
                    target_path_on_share = os.path.join(target_base_dir_on_share, series_folder, season_folder, f"{final_name_part}{current_file_ext}")
                    logger.info(f"TV show fallback: Using series folder '{series_folder}' with {season_folder}")
                else:
                    # Last resort: use the full cleaned name as both folder and filename
                    final_name_part = cleaned_name
                    target_path_on_share = os.path.join(target_base_dir_on_share, cleaned_name, f"{final_name_part}{current_file_ext}")
                    logger.info(f"TV show fallback: Creating individual folder '{cleaned_name}'")
        
        elif media_type == "movie":
            cleaned_name = self._clean_filename_basic(name_part_for_naming)
            year_match = re.search(r'(\d{4})', cleaned_name) # Check cleaned name first
            if not year_match:
                 year_match = re.search(r'(\d{4})', name_part_for_naming) # Then original name part

            movie_title_for_folder = cleaned_name # Start with cleaned name
            if year_match:
                year = year_match.group(1)
                # Refine title for folder: remove year from title part if present, then add (year)
                title_no_year = movie_title_for_folder.replace(year, "").strip()
                title_no_year = re.sub(r'\(\s*\)$', '', title_no_year).strip() # Remove trailing empty parens
                movie_title_for_folder = f"{title_no_year} ({year})"
            
            final_name_part = movie_title_for_folder # Filename base is the folder name
            target_path_on_share = os.path.join(target_base_dir_on_share, movie_title_for_folder, f"{final_name_part}{current_file_ext}")

        else: # Unknown type
            final_name_part = self._clean_filename_basic(name_part_for_naming)
            target_path_on_share = os.path.join(target_base_dir_on_share, "UnknownType", f"{final_name_part}{current_file_ext}")

        # Construct the filename with tags
        filename_with_tags = final_name_part # Start with the base name (e.g., "Series - S01E01" or "Movie Title (Year)")
        if resolution_tag:
            filename_with_tags += f".{resolution_tag}"
        if language.lower() != "english": # Or based on a config to always show language
             filename_with_tags += f".{language.capitalize()}"
        
        final_filename_with_ext = f"{filename_with_tags}{current_file_ext}"

        # Reconstruct the full target path using the new filename with tags
        if target_path_on_share: # if it was set (it should always be)
            base_folder_for_file = os.path.dirname(target_path_on_share) # e.g. .../SeriesName/Season 1
            target_path_on_share = os.path.join(base_folder_for_file, final_filename_with_ext)
        else: 
            logger.error(f"Target path construction failed for {original_filename_for_naming}")
            return None, None
            
        logger.info(f"Formatted filename with tags: {final_filename_with_ext}")
        logger.info(f"Final target path on share: {target_path_on_share}")
        return final_filename_with_ext, target_path_on_share

    def _extract_preferred_tracks(self, original_filepath: str, preferred_audio_lang: str, preferred_subtitle_lang: Optional[str] = None) -> Optional[str]:
        """
        Extracts preferred audio and subtitle tracks using mkvmerge.
        Returns path to the new temporary file if successful, else None.
        """
        media_info = self._get_media_info(original_filepath)
        if not media_info or not media_info.tracks:
            logger.warning(f"Cannot extract tracks: No media info for {original_filepath}")
            return None

        audio_tracks_to_keep = []
        subtitle_tracks_to_keep = []
        video_tracks_to_keep = [] # Usually keep all video tracks

        # Identify tracks - First log all available tracks for debugging
        logger.info(f"Available tracks in {os.path.basename(original_filepath)}:")
        for track in media_info.tracks:
            if track.track_type in ["Audio", "Text"]:
                logger.info(f"  {track.track_type} Track {track.track_id}: Language='{track.language}', Title='{getattr(track, 'title', 'N/A')}'")
        
        # Now identify tracks to keep
        for track in media_info.tracks:
            track_id = track.track_id # mkvmerge uses 0-based indexing from mediainfo's ID-1
            if track_id is None: continue # Skip tracks without ID

            if track.track_type == "Video":
                video_tracks_to_keep.append(str(track_id -1))
            elif track.track_type == "Audio":
                lang = str(track.language or "").lower()
                # Enhanced Malayalam language detection
                malayalam_codes = ['mal', 'malayalam', 'ml', 'm']
                
                if preferred_audio_lang == "mal":
                    # For Malayalam, check multiple possible language codes
                    if any(code in lang for code in malayalam_codes):
                        audio_tracks_to_keep.append(str(track_id -1))
                        logger.info(f"Found Malayalam audio track {track_id} with language '{lang}'")
                else:
                    # For other languages, use simple check
                    if preferred_audio_lang in lang:
                        audio_tracks_to_keep.append(str(track_id -1))
            elif track.track_type == "Text":
                lang = str(track.language or "").lower()
                # For Malayalam content, always keep English subtitles
                if preferred_audio_lang == "mal":
                    if any(code in lang for code in ['eng', 'english', 'en']):
                        subtitle_tracks_to_keep.append(str(track_id-1))
                        logger.info(f"Found English subtitle track {track_id} with language '{lang}'")
                elif preferred_subtitle_lang and preferred_subtitle_lang in lang:
                    subtitle_tracks_to_keep.append(str(track_id-1))
        
        if not audio_tracks_to_keep:
            logger.info(f"No '{preferred_audio_lang}' audio tracks found in {original_filepath}. Will process original file.")
            return original_filepath  # Process original file if no preferred tracks found

        # Define output temporary file path
        temp_dir = self.config.get("temp_dir", "/tmp/media-processor")
        os.makedirs(temp_dir, exist_ok=True)
        base_name, orig_ext = os.path.splitext(os.path.basename(original_filepath))
        # Ensure output is MKV as mkvmerge produces MKV
        temp_output_filepath = os.path.join(temp_dir, f"{base_name}_{preferred_audio_lang}_extracted.mkv")

        # Construct mkvmerge command
        # mkvmerge -o output.mkv --atracks 1 --stracks 0 input.mkv (example)
        # Track IDs for mkvmerge are 0-based from the list of tracks of a certain type,
        # OR you can use the actual Track IDs from mediainfo MINUS 1.
        # Using actual Track IDs (minus 1) is generally more reliable.
        
        cmd = ['mkvmerge', '-o', temp_output_filepath]
        
        # Add video tracks
        if video_tracks_to_keep:
            cmd.extend(['--video-tracks', ",".join(video_tracks_to_keep)])
        else: # Should not happen for valid video files
            logger.warning(f"No video tracks found in {original_filepath}. Extraction might fail or produce invalid file.")

        # Add audio tracks
        cmd.extend(['--audio-tracks', ",".join(audio_tracks_to_keep)])
        
        # Add subtitle tracks if any selected
        if subtitle_tracks_to_keep:
            cmd.extend(['--subtitle-tracks', ",".join(subtitle_tracks_to_keep)])
        else: # Explicitly exclude all other subtitles if none are preferred
            cmd.append('--no-subtitles')
            
        # Add original file
        cmd.append(original_filepath)

        logger.info(f"Executing mkvmerge command: {' '.join(cmd)}")
        try:
            process = subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info(f"mkvmerge output for {original_filepath}:\n{process.stdout}")
            if process.stderr:
                 logger.warning(f"mkvmerge stderr for {original_filepath}:\n{process.stderr}")
            
            if os.path.exists(temp_output_filepath) and os.path.getsize(temp_output_filepath) > 0:
                logger.info(f"Successfully extracted tracks to {temp_output_filepath}")
                return temp_output_filepath
            else:
                logger.error(f"mkvmerge command succeeded but output file {temp_output_filepath} is missing or empty.")
                return None
        except subprocess.CalledProcessError as e:
            logger.error(f"mkvmerge failed for {original_filepath}: {e}")
            logger.error(f"mkvmerge stdout: {e.stdout}")
            logger.error(f"mkvmerge stderr: {e.stderr}")
            # Clean up failed temp file if it exists
            if os.path.exists(temp_output_filepath):
                try: os.remove(temp_output_filepath)
                except OSError: pass
            return None
        except FileNotFoundError:
            logger.error("mkvmerge command not found. Please ensure mkvtoolnix is installed and in PATH.")
            return None


    def _transfer_file(self, source_path: str, target_path_on_share: str) -> bool:
        """Transfer a file to the target SMB location using smbclient command."""
        import subprocess
        import tempfile
        import os
        
        try:
            # Get SMB configuration from instance properties
            smb_server = self.config.get("smb_server")
            smb_share = self.config.get("smb_share")
            username = self.smb_params['username']
            password = self.smb_params['password']
            
            if not smb_server or not smb_share:
                logger.error("SMB server or share name not configured")
                return False
                
            if not os.path.exists(source_path):
                logger.error(f"Source file for transfer does not exist: {source_path}")
                return False
                
            remote_folder = os.path.dirname(target_path_on_share)
            filename = os.path.basename(target_path_on_share)
            
            # Construct the full path for SMB connection
            remote_unc_path = f"//{smb_server}/{smb_share}/{target_path_on_share}"
            logger.info(f"Transferring {source_path} to {remote_unc_path}")
            
            # Create temporary credentials file
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.creds') as creds_file:
                creds_file.write(f"username={username}\n")
                creds_file.write(f"password={password}\n")
                creds_path = creds_file.name
            
            try:
                # Create directory structure first
                if remote_folder:
                    # Create all parent directories
                    dir_parts = remote_folder.split('/')
                    current_dir = ""
                    for part in dir_parts:
                        if part:
                            current_dir = f"{current_dir}/{part}" if current_dir else part
                            mkdir_cmd = [
                                'smbclient', f'//{smb_server}/{smb_share}',
                                '-A', creds_path,
                                '-c', f'mkdir "{current_dir}"'
                            ]
                            # Run mkdir (ignore errors as directory might exist)
                            subprocess.run(mkdir_cmd, capture_output=True, text=True)
                
                # Transfer the file using smbclient
                put_cmd = [
                    'smbclient', f'//{smb_server}/{smb_share}',
                    '-A', creds_path,
                    '-c', f'put "{source_path}" "{target_path_on_share}"'
                ]
                
                result = subprocess.run(put_cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    logger.info(f"File transfer completed successfully: {source_path} -> {remote_unc_path}")
                    return True
                else:
                    logger.error(f"SMB transfer failed. Exit code: {result.returncode}")
                    logger.error(f"STDOUT: {result.stdout}")
                    logger.error(f"STDERR: {result.stderr}")
                    return False
                    
            finally:
                # Clean up credentials file
                try:
                    os.unlink(creds_path)
                except OSError:
                    pass
                    
        except Exception as e:
            logger.error(f"Failed to transfer file: {e}")
            return False

    def is_download_complete(self, filepath: str, min_stable_time_seconds: int = 60) -> bool:
        """
        Checks if a file is likely completely downloaded by checking if its size
        has been stable for a minimum period.
        """
        try:
            current_size = os.path.getsize(filepath)
            time.sleep(1) # Wait a very short moment
            # Check size again after a short delay to see if it's actively being written
            if os.path.getsize(filepath) != current_size:
                logger.debug(f"File size changed rapidly for {filepath}, likely still downloading.")
                return False

            # For a more robust check, compare with size from a few seconds ago
            # This requires storing previous size or using modification times.
            # A simpler approach for now: if it hasn't changed in 1s, assume stable enough for this check.
            # The shell script's check was also basic.
            # A more advanced check would involve checking modification time stability over `min_stable_time_seconds`.
            # For now, this basic check is a starting point.
            
            # Placeholder for a more robust check (e.g., using file modification times)
            # For example, check if mtime is older than `min_stable_time_seconds`
            # file_mtime = os.path.getmtime(filepath)
            # if (time.time() - file_mtime) < min_stable_time_seconds:
            #    logger.info(f"File {filepath} is too new, assuming download in progress (mtime check).")
            #    return False

            logger.debug(f"File {filepath} appears to be stable for processing.")
            return True
        except OSError as e:
            logger.error(f"Error checking download status for {filepath}: {e}")
            return False # Err on the side of caution

    def start_monitoring(self):
        """Monitors the download directory and processes new media files."""
        download_dir = self.config.get("download_dir")
        if not download_dir or not os.path.isdir(download_dir):
            logger.error(f"Invalid download directory configured: {download_dir}. Exiting monitoring.")
            return

        monitoring_interval = self.config.get("monitoring_interval_seconds", 60)
        global_dry_run = self.config.get("dry_run", False)
        media_extensions = tuple(self.config.get("media_extensions", [".mkv", ".mp4", ".avi"]))

        logger.info(f"Starting media monitoring for directory: {download_dir}")
        if global_dry_run:
            logger.info("Operating in DRY RUN mode globally.")

        while True:
            logger.info(f"Scanning {download_dir} for new media files...")
            found_files_this_scan = 0
            processed_files_this_scan = 0

            # Process files recursively in all subdirectories (unlimited depth)
            directories_to_cleanup = []
            
            for root, dirs, files in os.walk(download_dir):
                # Calculate relative depth for logging
                depth = root.replace(download_dir, '').count(os.sep)
                logger.info(f"Scanning directory (depth {depth}): {root}")
                
                for filename in files:
                    if filename.lower().endswith(media_extensions):
                        file_path = os.path.join(root, filename)
                        found_files_this_scan += 1
                        logger.info(f"Found potential media file: {file_path}")
                        
                        if self.is_download_complete(file_path):
                            if self.process_file(file_path, dry_run=global_dry_run):
                                processed_files_this_scan += 1
                                # Mark directory for cleanup check if file was processed
                                if root not in directories_to_cleanup:
                                    directories_to_cleanup.append(root)
                        else:
                            logger.info(f"Skipping incomplete file: {filename}")
            
            # After processing all files, check for empty directories and clean them up
            if self.config.get("clean_original_files", False):
                for dir_path in directories_to_cleanup:
                    try:
                        # Only remove if directory is empty after processing
                        if dir_path != download_dir and os.path.exists(dir_path) and not os.listdir(dir_path):
                            if global_dry_run:
                                logger.info(f"DRY RUN: Would remove empty processed directory: {dir_path}")
                            else:
                                logger.info(f"Removing empty processed directory: {dir_path}")
                                os.rmdir(dir_path)
                    except OSError as e:
                        logger.error(f"Error removing directory {dir_path}: {e}")
            
            logger.info(f"Scan complete. Found {found_files_this_scan} potential files, processed {processed_files_this_scan} files this cycle.")
            
            # Sync stats to Node.js dashboard if files were processed
            if processed_files_this_scan > 0:
                try:
                    sync_script_path = "/home/sharvinzlife/media-processor/sync-stats.js"
                    if os.path.exists(sync_script_path):
                        logger.info("Syncing dashboard stats after processing files...")
                        subprocess.run(['node', sync_script_path], check=True, capture_output=True)
                        logger.info("Dashboard stats synced successfully")
                    else:
                        logger.warning(f"Stats sync script not found: {sync_script_path}")
                except Exception as e:
                    logger.error(f"Error syncing dashboard stats: {e}")
            
            # General cleanup for RARs and any other empty dirs (e.g. if a dir had only RARs that were cleaned)
            self.cleanup_rar_files_py(download_dir, global_dry_run)
            self.cleanup_empty_dirs_py(download_dir, global_dry_run) # This will catch other empty dirs

            logger.info(f"Sleeping for {monitoring_interval} seconds before next scan...")
            time.sleep(monitoring_interval)

    def cleanup_rar_files_py(self, base_dir: str, dry_run: bool = False):
        """Cleans up leftover RAR files."""
        if not self.config.get("cleanup_rar_files", True): # Assuming a config option
            logger.info("RAR cleanup disabled by config, skipping.")
            return

        logger.info(f"Starting cleanup of leftover RAR files in {base_dir}...")
        rar_extensions = ('.rar', '.r00', '.r01') # Add more if needed, e.g. .part01.rar
        
        for dirpath, _, filenames in os.walk(base_dir):
            # Check RAR files in current directory
            rar_files_in_current_dir = [f for f in filenames if f.lower().endswith(rar_extensions) or '.part' in f.lower() and f.lower().endswith('.rar')]
            
            for rar_file in rar_files_in_current_dir:
                rar_file_path = os.path.join(dirpath, rar_file)
                # Condition from shell: delete if dir is empty except for this rar or other rars
                other_files_in_dir = [
                    f for f in os.listdir(dirpath) 
                    if not (f.lower().endswith(rar_extensions) or ('.part' in f.lower() and f.lower().endswith('.rar'))) 
                    and not f.startswith('.') # ignore hidden files
                ]
                
                if not other_files_in_dir:
                    if dry_run:
                        logger.info(f"DRY RUN: Would remove RAR file in likely empty/RAR-only directory: {rar_file_path}")
                    else:
                        logger.info(f"Removing RAR file in likely empty/RAR-only directory: {rar_file_path}")
                        try:
                            os.remove(rar_file_path)
                        except OSError as e:
                            logger.error(f"Error removing RAR file {rar_file_path}: {e}")
                else:
                    logger.debug(f"Skipping RAR file (directory '{dirpath}' not empty of non-RAR files): {rar_file_path}")
        logger.info("RAR file cleanup completed.")

    def cleanup_empty_dirs_py(self, base_dir: str, dry_run: bool = False, cleanup_processed_subdirs: bool = True):
        """Cleans up empty directories, starting from the deepest."""
        if not self.config.get("cleanup_empty_dirs", True): # Assuming a config option
            logger.info("Empty directory cleanup disabled by config, skipping.")
            return

        logger.info(f"Starting cleanup of empty directories in {base_dir}...")
        # Walk directories from bottom up to remove nested empty dirs correctly
        for dirpath, dirnames, filenames in os.walk(base_dir, topdown=False):
            # Skip the base_dir itself from being deleted if it becomes empty
            if os.path.realpath(dirpath) == os.path.realpath(base_dir):
                continue

            # Check if directory is empty (ignoring hidden files like .DS_Store)
            is_empty = not any(not f.startswith('.') for f in os.listdir(dirpath))
            
            if is_empty:
                if dry_run:
                    logger.info(f"DRY RUN: Would remove empty directory: {dirpath}")
                else:
                    logger.info(f"Removing empty directory: {dirpath}")
                    try:
                        os.rmdir(dirpath)
                    except OSError as e:
                        logger.error(f"Error removing directory {dirpath}: {e}")
            elif cleanup_processed_subdirs:
                 # This part handles the logic from shell's `process_media_directory`
                 # where a subdir is removed if all its files were processed and `CLEAN_ORIGINAL_FILES` is true.
                 # For Python, if `clean_original_files` is true, successfully processed files are removed.
                 # If a subdir becomes empty as a result, this `cleanup_empty_dirs_py` (called after processing)
                 # should naturally handle it.
                 # The key is that `process_file` should remove the original if `clean_original_files` is true.
                 pass # The general empty check above should cover this if files were deleted.

        logger.info("Empty directory cleanup completed.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Process media files.")
    parser.add_argument("file_path", nargs='?', default=None, help="Optional path to a single media file to process. If not provided, starts monitoring mode.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate processing without actual file operations. Overrides config if set.")
    parser.add_argument("--config", default="/etc/media-processor/config.json", help="Path to the configuration file.")
    
    args = parser.parse_args()
    
    processor = MediaProcessor(config_path=args.config)

    # Determine dry_run mode: command line flag takes precedence over config
    is_dry_run = args.dry_run if args.dry_run else processor.config.get("dry_run", False)
    if args.dry_run: # If CLI flag is set, ensure it's logged
        logger.info("Dry run mode enabled via command line flag.")
        processor.config['dry_run'] = True # Ensure processor instance knows

    if args.file_path:
        logger.info(f"Processing single file: {args.file_path}")
        success = processor.process_file(args.file_path, dry_run=is_dry_run)
        sys.exit(0 if success else 1)
    else:
        processor.start_monitoring() # Enters infinite loop

# Required for the new detect_media_attributes method
import re
