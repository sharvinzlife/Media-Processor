"""
TMDB (The Movie Database) API client for movie title lookup and sanitization.
Provides intelligent movie title matching and metadata retrieval.
"""

import os
import re
import time
import logging
import requests
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from functools import lru_cache

logger = logging.getLogger(__name__)


class TMDBClient:
    """Client for interacting with TMDB API for movie information."""
    
    BASE_URL = "https://api.themoviedb.org/3"
    SEARCH_ENDPOINT = "/search/movie"
    MOVIE_ENDPOINT = "/movie/{movie_id}"
    
    # Rate limiting: TMDB allows 40 requests per 10 seconds
    RATE_LIMIT_REQUESTS = 40
    RATE_LIMIT_WINDOW = 10  # seconds
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize TMDB client.
        
        Args:
            api_key: TMDB API key. If not provided, looks for TMDB_API_KEY in environment.
        """
        self.api_key = api_key or os.environ.get('TMDB_API_KEY', '')
        if not self.api_key:
            logger.warning("TMDB API key not configured. TMDB features will be disabled.")
        
        # Rate limiting tracking
        self.request_times: List[float] = []
        
        # Cache for API responses (in-memory cache with 1 hour TTL)
        self._cache_ttl = 3600  # 1 hour
        
    def _rate_limit(self):
        """Implement rate limiting to respect TMDB API limits."""
        now = time.time()
        
        # Remove requests older than the rate limit window
        self.request_times = [t for t in self.request_times if now - t < self.RATE_LIMIT_WINDOW]
        
        # If we've hit the rate limit, wait
        if len(self.request_times) >= self.RATE_LIMIT_REQUESTS:
            sleep_time = self.RATE_LIMIT_WINDOW - (now - self.request_times[0]) + 0.1
            if sleep_time > 0:
                logger.debug(f"Rate limit reached. Sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)
        
        # Record this request
        self.request_times.append(now)
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """
        Make a request to TMDB API with rate limiting and error handling.
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            API response as dict or None if failed
        """
        if not self.api_key:
            return None
        
        # Apply rate limiting
        self._rate_limit()
        
        # Prepare request
        url = f"{self.BASE_URL}{endpoint}"
        params = params or {}
        params['api_key'] = self.api_key
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"TMDB API request failed: {e}")
            return None
    
    def extract_title_and_year(self, filename: str) -> Tuple[str, Optional[int]]:
        """
        Extract movie title and year from filename.
        
        Args:
            filename: Movie filename to parse
            
        Returns:
            Tuple of (title, year) where year may be None
        """
        # Remove file extension
        name = os.path.splitext(filename)[0]
        
        # Store original name for year extraction
        original_name = name
        
        # Remove torrent site prefixes and suffixes
        torrent_site_patterns = [
            r'^sanet[\s._]*st[\s._]*',  # Sanet.st
            r'^www[\s.]*\d*\s*tamilmv[\s.]*\w*\s*-\s*',  # TamilMV variations
            r'^www\.\w+\.\w+\s*-\s*',  # General website patterns
            r'^\[\s*(?:www[\s.]*)?\w*(?:tamilmv|sanet|rarbg|yts)[\s.]*\w*\s*\]\s*',  # Bracketed sites at start
            r'^\[?(rarbg|yts|1337x|torrentz|kickass)\]?[\s._]*-?\s*',  # Common torrent sites at start
            r'\[\s*(?:yts|rarbg|1337x)[\s.]*\w*\s*\]$',  # Site tags at end like [YTS.MX]
        ]
        
        for pattern in torrent_site_patterns:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # Replace dots and underscores with spaces
        name = re.sub(r'[\._]', ' ', name)
        
        # Split at quality/technical indicators to get clean title
        title_separators = [
            r'\s*-?\s*(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip|HDCAM|CAM|TS)',
            r'\s+(?:TRUE\s+)?(?:WEB-DL|BluRay|HDRip|DVDRip|BRRip|WebRip|HDCAM|CAM|TS)',
            r'\s*-?\s*\d+p',  # Quality indicators like 1080p
            r'\s+\d+p',
            r'\s*-?\s*(?:MAX\s+)?(?:WEB-DL|BluRay)',
            r'\s+(?:MAX\s+)?(?:WEB-DL|BluRay)',
        ]
        
        for separator in title_separators:
            match = re.search(separator, name, flags=re.IGNORECASE)
            if match:
                name = name[:match.start()].strip()
                break
        
        # Remove brackets with quality/technical info but preserve year brackets
        bracket_patterns = [
            r'\[(?!\d{4})[^\]]*\]',  # Remove brackets that don't contain a 4-digit year
            r'\[.*?(?:1080p|720p|BluRay|x264|x265|WEB|DL).*?\]',  # Remove brackets with technical terms
        ]
        
        for pattern in bracket_patterns:
            name = re.sub(pattern, ' ', name, flags=re.IGNORECASE)
        
        # Clean up the title - remove common tags and quality indicators
        cleanup_patterns = [
            r'\b(1080p|720p|480p|2160p|4K|UHD|HD|SD)\b',
            r'\b(BluRay|Blu-Ray|BRRip|BDRip|WEB-DL|WEBRip|HDTV|DVDRip|DVD|WEB)\b',
            r'\b(x264|x265|h264|h265|HEVC|AVC)\b',
            r'\b(DDP|DD|AC3|AAC|DTS|TrueHD|Atmos)\b',
            r'\b(5\.1|7\.1|2\.0)\b',
            r'\b(REMUX|REPACK|PROPER|EXTENDED|UNRATED|DIRECTORS\.CUT|THEATRICAL)\b',
            r'-[A-Za-z0-9]+$',  # Remove release group at end (e.g., -PiRaTeS)
            r'\b(MAX|AMZN|NF|DSNP|HMAX|ATVP|HULU)\b',  # Streaming services
            r'\bIMAX\b',  # IMAX indicator
        ]
        
        for pattern in cleanup_patterns:
            name = re.sub(pattern, ' ', name, flags=re.IGNORECASE)
        
        # Clean up brackets and parentheses that don't contain years
        name = re.sub(r'\[(?!\d{4})[^\]]*\]?', '', name)  # Remove incomplete brackets too
        name = re.sub(r'\((?!\d{4})[^)]*\)?', '', name)  # Remove incomplete parentheses too
        name = re.sub(r'\[\s*\]', '', name)  # Remove empty brackets
        name = re.sub(r'\(\s*\)', '', name)  # Remove empty parentheses
        name = re.sub(r'\s*\[\s*$', '', name)  # Remove trailing incomplete bracket
        name = re.sub(r'\s*\(\s*$', '', name)  # Remove trailing incomplete parenthesis
        title = re.sub(r'\s+', ' ', name).strip()
        
        # Extract year from original filename
        year = None
        year_patterns = [
            r'[\(\[](\d{4})[\)\]]',  # (2023) or [2023]
            r'\.(\d{4})\.',          # .2023.
            r'\s(\d{4})\s',          # space 2023 space
            r'[\.\-\s](\d{4})[\.\-\s]',  # various separators
            r'\b(\d{4})\b',          # any 4-digit number as word boundary
        ]
        
        for pattern in year_patterns:
            match = re.search(pattern, original_name)
            if match:
                potential_year = int(match.group(1))
                # Validate year is reasonable (1888 was first movie)
                if 1888 <= potential_year <= datetime.now().year + 2:
                    year = potential_year
                    break
        
        return title, year
    
    @lru_cache(maxsize=1000)
    def search_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
        """
        Search for a movie on TMDB.
        
        Args:
            title: Movie title to search for
            year: Optional year to narrow search
            
        Returns:
            Best matching movie data or None
        """
        if not title:
            return None
        
        params = {
            'query': title,
            'include_adult': False
        }
        
        if year:
            params['year'] = year
        
        result = self._make_request(self.SEARCH_ENDPOINT, params)
        if not result or 'results' not in result or not result['results']:
            # If no results with year, try without year
            if year:
                logger.debug(f"No results for '{title}' ({year}), trying without year")
                params.pop('year')
                result = self._make_request(self.SEARCH_ENDPOINT, params)
                if not result or 'results' not in result or not result['results']:
                    return None
            else:
                return None
        
        # Return the best match (first result, as TMDB sorts by relevance)
        return result['results'][0]
    
    def get_movie_details(self, movie_id: int) -> Optional[Dict]:
        """
        Get detailed movie information from TMDB.
        
        Args:
            movie_id: TMDB movie ID
            
        Returns:
            Movie details or None
        """
        endpoint = self.MOVIE_ENDPOINT.format(movie_id=movie_id)
        return self._make_request(endpoint)
    
    def sanitize_movie_title(self, filename: str, include_year: bool = True,
                           include_tmdb_id: bool = False) -> Tuple[str, Optional[Dict]]:
        """
        Sanitize movie filename using TMDB lookup.
        
        Args:
            filename: Original filename
            include_year: Whether to include year in sanitized title
            include_tmdb_id: Whether to include TMDB ID in result
            
        Returns:
            Tuple of (sanitized_title, tmdb_data)
        """
        # Extract title and year from filename
        extracted_title, year = self.extract_title_and_year(filename)
        logger.debug(f"Extracted title: '{extracted_title}', year: {year}")
        
        # Search TMDB for the movie
        movie_data = self.search_movie(extracted_title, year)
        
        if movie_data:
            # Use TMDB's official title
            official_title = movie_data.get('title', extracted_title)
            release_year = None
            
            if 'release_date' in movie_data and movie_data['release_date']:
                try:
                    release_year = int(movie_data['release_date'][:4])
                except (ValueError, IndexError):
                    pass
            
            # Construct sanitized title
            if include_year and release_year:
                sanitized = f"{official_title} ({release_year})"
            else:
                sanitized = official_title
            
            # Add TMDB ID if requested
            if include_tmdb_id:
                sanitized = f"{sanitized} [tmdb-{movie_data['id']}]"
            
            logger.info(f"TMDB match found: '{filename}' -> '{sanitized}'")
            return sanitized, movie_data
        else:
            # Fallback to basic sanitization
            logger.debug(f"No TMDB match for '{extracted_title}', using fallback")
            
            # Basic cleanup
            clean_title = extracted_title
            
            # Add year if available
            if include_year and year:
                clean_title = f"{clean_title} ({year})"
            
            return clean_title, None
    
    def is_available(self) -> bool:
        """Check if TMDB API is available and configured."""
        return bool(self.api_key)