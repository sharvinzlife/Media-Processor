#!/usr/bin/env python3
"""Media type and language detection utilities"""

import os
import re
import logging
from typing import Tuple, Optional
from pymediainfo import MediaInfo

logger = logging.getLogger(__name__)

class MediaDetector:
    """Detects media type and language from files"""
    
    def __init__(self):
        """Initialize media detector"""
        self.tv_show_patterns = [
            r'[Ss](\d+)[Ee](\d+)',  # S01E01 format
            r'[Ss]eason\s*(\d+).*?[Ee]pisode\s*(\d+)',  # Season X Episode Y
            r'(\d+)x(\d+)',  # 1x01 format
        ]
        
        self.malayalam_indicators = [
            'malayalam', 'mal', 'ml', 'kerala', 'mollywood'
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
        filename_lower = filename.lower()
        
        # Check for TV show patterns
        for pattern in self.tv_show_patterns:
            if re.search(pattern, filename_lower):
                logger.info(f"TV show pattern found in '{filename}': {pattern}")
                return "tvshow"
        
        # Default to movie if no TV patterns found
        logger.info(f"No TV show patterns found, classifying '{filename}' as movie")
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