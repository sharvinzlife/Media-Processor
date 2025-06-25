#!/usr/bin/env python3
"""Media type and language detection utilities"""

import os
import re
import logging
from typing import Tuple, Optional, Dict
from pymediainfo import MediaInfo

# Import TMDB client
try:
    from api.tmdb_client import TMDBClient
except ImportError:
    TMDBClient = None

logger = logging.getLogger(__name__)

class MediaDetector:
    """Detects media type and language from files"""
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize media detector"""
        self.config = config or {}
        
        # Initialize TMDB client if API key is available
        self.tmdb_client = None
        if TMDBClient:
            try:
                self.tmdb_client = TMDBClient()
                if self.tmdb_client.is_available():
                    logger.info("TMDB integration enabled")
                else:
                    logger.info("TMDB API key not configured - fallback cleaning will be used")
            except Exception as e:
                logger.warning(f"Failed to initialize TMDB client: {e}")
        
        self.tv_show_patterns = [
            r'[Ss](\d+)[Ee](\d+)',  # S01E01 format
            r'[Ss]eason\s*(\d+).*?[Ee]pisode\s*(\d+)',  # Season X Episode Y
            r'(\d+)x(\d+)',  # 1x01 format
            r'[Ss](\d{1,2})(?:\s|$)',  # S01 format (season only)
            r'[Ss]eason\s*(\d+)',  # Season 1 format (without episode)
            r'Part\s*(\d+)',  # Part 1 format
            r'Episode\s*(\d+)',  # Episode 1 format
            r'EP(\d+)',  # EP01 format (for Kerala Crime Files style)
            r'EP\((\d+)-(\d+)\)',  # EP(01-06) format (multi-episode)
        ]
        
        self.malayalam_indicators = [
            'malayalam', 'mal', 'ml', 'kerala', 'mollywood', 'malayalee', 'malayali', 'm', 'M'
        ]
        
        self.english_indicators = [
            'english', 'eng', 'en', 'hollywood', 'usa', 'uk'
        ]
        
        self.hindi_indicators = [
            'hindi', 'hin', 'hi', 'bollywood', 'multi', 'multilang', 'dual', 'all lang'
        ]
        
        self.regional_indicators = [
            'telugu', 'tel', 'tamil', 'tam', 'kannada', 'kan', 'kollywood', 'tollywood', 'sandalwood'
        ]
    
    def detect_media_type(self, filename: str) -> str:
        """Detect if file is movie or TV show"""
        # Use original filename for pattern matching to preserve case
        basename = os.path.basename(filename)
        
        # Check for TV show patterns
        for pattern in self.tv_show_patterns:
            if re.search(pattern, basename, re.IGNORECASE):
                logger.info(f"TV show pattern found in '{basename}': {pattern}")
                return "tvshow"
        
        # Additional TV show indicators
        tv_keywords = ['series', 'episode', 'season', 'S0', 'S1', 'S2', 'E0', 'E1', 'E2']
        for keyword in tv_keywords:
            if keyword.lower() in basename.lower():
                logger.info(f"TV show keyword '{keyword}' found in '{basename}'")
                return "tvshow"
        
        # Default to movie if no TV patterns found
        logger.info(f"No TV show patterns found, classifying '{basename}' as movie")
        return "movie"
    
    def detect_language_from_filename(self, filename: str) -> str:
        """Enhanced language detection with new routing logic"""
        filename_lower = filename.lower()
        
        # Priority 1: Check for Malayalam indicators first
        for indicator in self.malayalam_indicators:
            if indicator in ['mal', 'ml']:  # Short codes need word boundaries
                if re.search(r'\b' + indicator + r'\b', filename_lower):
                    logger.info(f"Malayalam indicator '{indicator}' found - will extract Malayalam audio + English subs")
                    return "malayalam"
            else:  # Full words can use simple substring matching
                if indicator in filename_lower:
                    logger.info(f"Malayalam indicator '{indicator}' found - will extract Malayalam audio + English subs")
                    return "malayalam"
        
        # Priority 2: Check for Hindi/Bollywood/Multi-language indicators (before English)
        for indicator in self.hindi_indicators:
            if indicator in ['hin', 'hi']:  # Short codes need word boundaries
                if re.search(r'\b' + indicator + r'\b', filename_lower):
                    logger.info(f"Hindi/Multi-language indicator '{indicator}' found - routing to Bollywood folder")
                    return "bollywood"
            else:  # Full words can use simple substring matching
                if indicator in filename_lower:
                    logger.info(f"Hindi/Multi-language indicator '{indicator}' found - routing to Bollywood folder")
                    return "bollywood"
        
        # Priority 3: Check for English indicators
        for indicator in self.english_indicators:
            if indicator in ['eng', 'en']:  # Short codes need word boundaries
                if re.search(r'\b' + indicator + r'\b', filename_lower):
                    logger.info(f"English indicator '{indicator}' found - routing to English folder")
                    return "english"
            else:  # Full words can use simple substring matching
                if indicator in filename_lower:
                    logger.info(f"English indicator '{indicator}' found - routing to English folder")
                    return "english"
        
        # Priority 4: Check for regional language indicators (Telugu, Tamil, Kannada)
        for indicator in self.regional_indicators:
            if indicator in ['tel', 'tam', 'kan']:  # Short codes need word boundaries
                if re.search(r'\b' + indicator + r'\b', filename_lower):
                    logger.info(f"Regional language indicator '{indicator}' found - routing to Malayalam folder")
                    return "malayalam"
            else:  # Full words can use simple substring matching
                if indicator in filename_lower:
                    logger.info(f"Regional language indicator '{indicator}' found - routing to Malayalam folder")
                    return "malayalam"
        
        # Default fallback - unknown regional content goes to Malayalam folder
        logger.info("No specific language indicators found - defaulting to Malayalam folder for regional content")
        return "malayalam"
    
    def detect_language_from_audio_tracks(self, file_path: str) -> Tuple[str, bool]:
        """Detect language from audio tracks using MediaInfo"""
        try:
            media_info = MediaInfo.parse(file_path)
            malayalam_tracks = []
            english_tracks = []
            all_audio_tracks = []
            
            for track in media_info.tracks:
                if track.track_type == 'Audio':
                    all_audio_tracks.append(track)
                    track_lang = (track.language or '').lower()
                    track_title = (track.title or '').lower()
                    
                    # Check for Malayalam audio
                    malayalam_patterns = ['mal', 'malayalam', 'ml', 'm']
                    if any(pattern in track_lang or pattern in track_title for pattern in malayalam_patterns):
                        malayalam_tracks.append(track)
                        logger.info(f"Malayalam audio track found: Language={track.language}, Title={track.title}")
                    
                    # Check for English audio  
                    english_patterns = ['eng', 'english', 'en']
                    if any(pattern in track_lang or pattern in track_title for pattern in english_patterns):
                        english_tracks.append(track)
                        logger.info(f"English audio track found: Language={track.language}, Title={track.title}")
            
            logger.info(f"Audio track analysis: {len(malayalam_tracks)} Malayalam, {len(english_tracks)} English, {len(all_audio_tracks)} total")
            
            # Determine language and if extraction is needed
            if malayalam_tracks:
                # Has Malayalam tracks - needs extraction if there are also other tracks
                needs_extraction = len(all_audio_tracks) > len(malayalam_tracks)
                return "malayalam", needs_extraction
            elif english_tracks:
                return "english", False
            else:
                # No clear language markers, use filename as fallback
                filename_lang = self.detect_language_from_filename(file_path)
                return filename_lang, False
                
        except Exception as e:
            logger.error(f"Error analyzing audio tracks: {e}")
            # Fallback to filename detection
            filename_lang = self.detect_language_from_filename(file_path)
            return filename_lang, False
    
    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return os.path.getsize(file_path)
        except OSError:
            return 0
    
    def sanitize_movie_filename(self, filename: str, media_type: str = "movie") -> Tuple[str, Optional[Dict]]:
        """
        Sanitize movie filename using TMDB lookup with fallback to basic cleaning.
        
        Args:
            filename: Original filename to sanitize
            media_type: Type of media ("movie" or "tvshow")
            
        Returns:
            Tuple of (sanitized_filename, tmdb_data_if_available)
        """
        # Only apply TMDB lookup for movies (not TV shows)
        if media_type == "movie" and self.tmdb_client and self.tmdb_client.is_available():
            try:
                # Get configuration options
                include_year = self.config.get('tmdb_include_year', True)
                include_id = self.config.get('tmdb_include_id', False)
                
                # Try TMDB lookup
                sanitized_title, tmdb_data = self.tmdb_client.sanitize_movie_title(
                    filename, 
                    include_year=include_year,
                    include_tmdb_id=include_id
                )
                
                if tmdb_data:
                    logger.info(f"TMDB sanitization successful: '{filename}' -> '{sanitized_title}'")
                    return sanitized_title, tmdb_data
                else:
                    logger.debug(f"No TMDB match found for '{filename}', using fallback")
            except Exception as e:
                logger.warning(f"TMDB lookup failed for '{filename}': {e}, using fallback")
        
        # Fallback to basic cleaning (existing logic)
        sanitized_title = self._fallback_filename_cleaning(filename)
        logger.debug(f"Fallback sanitization: '{filename}' -> '{sanitized_title}'")
        return sanitized_title, None
    
    def _fallback_filename_cleaning(self, filename: str) -> str:
        """
        Fallback filename cleaning logic (similar to existing _clean_filename_basic).
        This is used when TMDB lookup fails or is not available.
        """
        name_part, ext_part = os.path.splitext(filename)
        original_name = name_part
        
        # Extract year to preserve it
        year_match = re.search(r'\((\d{4})\)', name_part)
        if not year_match:
            year_match = re.search(r'\b(\d{4})\b', name_part)
        year_value = year_match.group(1) if year_match else None
        
        # Remove torrent site prefixes
        torrent_site_patterns = [
            r'^sanet[\s._]*st[\s._]*',
            r'^www[\s.]*\d*\s*tamilmv[\s.]*\w*\s*-\s*',
            r'^www\.\w+\.\w+\s*-\s*',
            r'^\[\s*(?:www[\s.]*)?\w*(?:tamilmv|sanet|rarbg|yts)[\s.]*\w*\s*\]\s*',
            r'^\[?(rarbg|yts|1337x|torrentz|kickass)\]?[\s._]*-?\s*',
        ]
        
        for pattern in torrent_site_patterns:
            name_part = re.sub(pattern, '', name_part, flags=re.IGNORECASE)
        
        # Convert underscores and dots to spaces
        name_part = name_part.replace('_', ' ').replace('.', ' ')
        
        # Remove technical quality indicators
        title_separators = [
            r'\s*-\s*(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip|HDCAM|CAM|TS)',
            r'\s+(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip|HDCAM|CAM|TS)',
            r'\s*-\s*\d+p',
            r'\s+\d+p',
            r'\s*-\s*(?:MAX\s+)?(?:WEB-DL|BluRay)',
            r'\s+(?:MAX\s+)?(?:WEB-DL|BluRay)',
        ]
        
        for separator in title_separators:
            match = re.search(separator, name_part, flags=re.IGNORECASE)
            if match:
                name_part = name_part[:match.start()].strip()
                break
        
        # Remove release group tags
        release_group_patterns = [
            r'\s*-\s*[A-Z]{2,}$',
            r'\s*\[[A-Z0-9]{2,}\]$',
            r'\s*\([A-Z0-9]{2,}\)$',
            r'\s*-\s*[A-Za-z0-9]{3,}$',
        ]
        
        for pattern in release_group_patterns:
            name_part = re.sub(pattern, '', name_part, flags=re.IGNORECASE)
        
        # Remove common junk patterns
        junk_patterns = [
            r'\[.*?\]',
            r'\b(x264|x265|AVC|HEVC|H\s*264|H\s*265)\b',
            r'\b(DD\+?[\d.]+|DTS|AAC|DDP\s*[\d.]+)\b',
            r'\b\d+Kbps\b',
            r'\b\d+\.?\d*GB\b',
            r'\bESub\b',
            r'\bWEB\s*-?\s*DL\b',
            r'\bBluRay\b',
            r'\bHDRip\b',
            r'\bMAX\b',
        ]
        
        for pattern in junk_patterns:
            name_part = re.sub(pattern, ' ', name_part, flags=re.IGNORECASE)
        
        # Clean up spaces
        name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # Remove parentheses that don't contain a year
        name_part = re.sub(r'\((?!\d{4})[^)]*\)', '', name_part).strip()
        name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # If result is too short, use conservative approach
        if len(name_part) < 3:
            name_part = original_name
            name_part = re.sub(r'^sanet[\s._]*st[\s._]*', '', name_part, flags=re.IGNORECASE)
            name_part = name_part.replace('_', ' ').replace('.', ' ')
            name_part = re.sub(r'\s+', ' ', name_part).strip()
        
        # Add year back if not present and we found one
        if year_value and f"({year_value})" not in name_part and year_value not in name_part:
            name_part = f"{name_part} ({year_value})"
        
        return f"{name_part}{ext_part}"