#!/usr/bin/env python3
"""
Robust SQLite database system for Media Processor activity tracking.
Provides comprehensive activity logging, statistics, and backup/restore functionality.
"""

import sqlite3
import json
import os
import shutil
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class MediaDatabase:
    """Robust SQLite database for comprehensive media processing activity tracking."""
    
    def __init__(self, db_path: str = None):
        """Initialize database with proper schema and indexes."""
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), '../../..', 'data', 'media_processor.db')
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
    def _init_database(self):
        """Create database schema with proper indexes."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            
            # Main media processing table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS media_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_hash TEXT UNIQUE,
                    type TEXT NOT NULL CHECK(type IN ('movie', 'tvshow', 'unknown')),
                    language TEXT NOT NULL CHECK(language IN ('malayalam', 'english', 'hindi', 'tamil', 'telugu', 'unknown')),
                    series_name TEXT,
                    season_number INTEGER,
                    episode_number INTEGER,
                    source_path TEXT NOT NULL,
                    destination_path TEXT NOT NULL,
                    file_size_bytes INTEGER,
                    file_size_readable TEXT,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'success' CHECK(status IN ('success', 'failed', 'processing')),
                    error_message TEXT,
                    tmdb_id INTEGER,
                    tmdb_title TEXT,
                    tmdb_year INTEGER,
                    extraction_applied BOOLEAN DEFAULT FALSE,
                    tracks_removed TEXT,  -- JSON list of removed tracks
                    size_reduction_bytes INTEGER,
                    size_reduction_percent REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Statistics cache table for fast dashboard queries
            conn.execute("""
                CREATE TABLE IF NOT EXISTS statistics (
                    id INTEGER PRIMARY KEY,
                    english_movies INTEGER DEFAULT 0,
                    malayalam_movies INTEGER DEFAULT 0,
                    english_tv_shows INTEGER DEFAULT 0,
                    malayalam_tv_shows INTEGER DEFAULT 0,
                    hindi_movies INTEGER DEFAULT 0,
                    hindi_tv_shows INTEGER DEFAULT 0,
                    total_files_processed INTEGER DEFAULT 0,
                    total_size_processed_bytes INTEGER DEFAULT 0,
                    total_size_saved_bytes INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Processing sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS processing_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    session_end TIMESTAMP,
                    files_processed INTEGER DEFAULT 0,
                    files_successful INTEGER DEFAULT 0,
                    files_failed INTEGER DEFAULT 0,
                    total_size_bytes INTEGER DEFAULT 0,
                    session_type TEXT DEFAULT 'automatic',
                    notes TEXT
                )
            """)
            
            # Season folder mapping table for unification
            conn.execute("""
                CREATE TABLE IF NOT EXISTS season_folders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    series_name_normalized TEXT NOT NULL,
                    series_name_variations TEXT,  -- JSON list of name variations
                    canonical_folder_name TEXT NOT NULL,
                    destination_path TEXT NOT NULL,
                    language TEXT NOT NULL,
                    total_seasons INTEGER DEFAULT 0,
                    total_episodes INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(series_name_normalized, language)
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_media_type_lang ON media_files(type, language)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_media_processed_at ON media_files(processed_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_media_status ON media_files(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_media_series ON media_files(series_name, season_number)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_season_folders_series ON season_folders(series_name_normalized)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_media_hash ON media_files(file_hash)")
            
            # Initialize statistics if empty
            stats_count = conn.execute("SELECT COUNT(*) FROM statistics").fetchone()[0]
            if stats_count == 0:
                conn.execute("INSERT INTO statistics (id) VALUES (1)")
            
            conn.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    def add_media_file(self, **kwargs) -> int:
        """Add a processed media file record."""
        required_fields = ['filename', 'original_filename', 'type', 'language', 'source_path', 'destination_path']
        
        for field in required_fields:
            if field not in kwargs:
                raise ValueError(f"Required field '{field}' missing")
        
        # Generate file hash for deduplication
        if 'file_hash' not in kwargs:
            kwargs['file_hash'] = self._generate_file_hash(kwargs['original_filename'], kwargs['destination_path'])
        
        with sqlite3.connect(self.db_path) as conn:
            # Insert media file record
            placeholders = ', '.join(['?' for _ in kwargs])
            columns = ', '.join(kwargs.keys())
            
            cursor = conn.execute(
                f"INSERT OR REPLACE INTO media_files ({columns}) VALUES ({placeholders})",
                list(kwargs.values())
            )
            
            file_id = cursor.lastrowid
            
            # Update statistics
            self._update_statistics(conn)
            
            # Update season folder mapping if TV show
            if kwargs['type'] == 'tvshow' and kwargs.get('series_name'):
                self._update_season_folder_mapping(
                    conn, 
                    kwargs['series_name'], 
                    kwargs['language'], 
                    kwargs['destination_path'],
                    kwargs.get('season_number'),
                    kwargs.get('episode_number')
                )
            
            conn.commit()
            logger.info(f"Added media file record: {kwargs['filename']} (ID: {file_id})")
            return file_id
    
    def _generate_file_hash(self, filename: str, path: str) -> str:
        """Generate a unique hash for file deduplication."""
        content = f"{filename}:{path}:{datetime.now().date()}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _update_statistics(self, conn):
        """Update statistics cache."""
        stats = {}
        
        # Count by type and language
        for media_type in ['movie', 'tvshow']:
            for language in ['english', 'malayalam', 'hindi']:
                count = conn.execute(
                    "SELECT COUNT(*) FROM media_files WHERE type = ? AND language = ? AND status = 'success'",
                    (media_type, language)
                ).fetchone()[0]
                
                # Handle TV show naming convention
                if media_type == 'tvshow':
                    key = f"{language}_tv_shows"
                else:
                    key = f"{language}_{media_type}s"
                stats[key] = count
        
        # Total statistics
        stats['total_files_processed'] = conn.execute(
            "SELECT COUNT(*) FROM media_files WHERE status = 'success'"
        ).fetchone()[0]
        
        stats['total_size_processed_bytes'] = conn.execute(
            "SELECT COALESCE(SUM(file_size_bytes), 0) FROM media_files WHERE status = 'success'"
        ).fetchone()[0] or 0
        
        stats['total_size_saved_bytes'] = conn.execute(
            "SELECT COALESCE(SUM(size_reduction_bytes), 0) FROM media_files WHERE size_reduction_bytes > 0"
        ).fetchone()[0] or 0
        
        # Update statistics table
        set_clause = ', '.join([f"{key} = ?" for key in stats.keys()])
        conn.execute(
            f"UPDATE statistics SET {set_clause}, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
            list(stats.values())
        )
    
    def _update_season_folder_mapping(self, conn, series_name: str, language: str, 
                                    destination_path: str, season_num: int = None, episode_num: int = None):
        """Update season folder mapping for series unification."""
        normalized_name = self._normalize_series_name(series_name)
        
        # Check if series already exists
        existing = conn.execute(
            "SELECT id, series_name_variations, total_seasons, total_episodes FROM season_folders WHERE series_name_normalized = ? AND language = ?",
            (normalized_name, language)
        ).fetchone()
        
        if existing:
            # Update existing record
            folder_id, variations_json, total_seasons, total_episodes = existing
            variations = json.loads(variations_json) if variations_json else []
            
            if series_name not in variations:
                variations.append(series_name)
            
            # Update counts
            if season_num and season_num > total_seasons:
                total_seasons = season_num
            if episode_num:
                total_episodes += 1
            
            conn.execute("""
                UPDATE season_folders 
                SET series_name_variations = ?, total_seasons = ?, total_episodes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (json.dumps(variations), total_seasons, total_episodes, folder_id))
        else:
            # Create new record
            canonical_name = self._get_canonical_folder_name(series_name)
            conn.execute("""
                INSERT INTO season_folders 
                (series_name_normalized, series_name_variations, canonical_folder_name, destination_path, language, total_seasons, total_episodes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (normalized_name, json.dumps([series_name]), canonical_name, destination_path, language, season_num or 1, 1))
    
    def _normalize_series_name(self, series_name: str) -> str:
        """Normalize series name for matching."""
        import re
        # Remove year, special characters, extra spaces
        normalized = re.sub(r'\(\d{4}\)', '', series_name)  # Remove (2023)
        normalized = re.sub(r'[^\w\s]', ' ', normalized)     # Remove special chars
        normalized = re.sub(r'\s+', ' ', normalized).strip().lower()  # Normalize spaces
        return normalized
    
    def _get_canonical_folder_name(self, series_name: str) -> str:
        """Get canonical folder name without year suffixes."""
        import re
        # Remove year in parentheses
        canonical = re.sub(r'\s*\(\d{4}\)\s*', '', series_name).strip()
        return canonical
    
    def get_season_folder_mapping(self, series_name: str, language: str) -> Optional[Dict]:
        """Get existing season folder mapping for series unification."""
        normalized_name = self._normalize_series_name(series_name)
        
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("""
                SELECT canonical_folder_name, destination_path, total_seasons, total_episodes, series_name_variations
                FROM season_folders 
                WHERE series_name_normalized = ? AND language = ?
            """, (normalized_name, language)).fetchone()
            
            if result:
                canonical_name, dest_path, seasons, episodes, variations_json = result
                return {
                    'canonical_folder_name': canonical_name,
                    'destination_path': dest_path,
                    'total_seasons': seasons,
                    'total_episodes': episodes,
                    'name_variations': json.loads(variations_json) if variations_json else []
                }
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get current statistics for dashboard."""
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("""
                SELECT english_movies, malayalam_movies, english_tv_shows, malayalam_tv_shows,
                       hindi_movies, hindi_tv_shows, total_files_processed, total_size_processed_bytes,
                       total_size_saved_bytes, last_updated
                FROM statistics WHERE id = 1
            """).fetchone()
            
            if result:
                return {
                    'english_movies': result[0],
                    'malayalam_movies': result[1],
                    'english_tv_shows': result[2],
                    'malayalam_tv_shows': result[3],
                    'hindi_movies': result[4],
                    'hindi_tv_shows': result[5],
                    'total_files_processed': result[6],
                    'total_size_processed_bytes': result[7],
                    'total_size_saved_bytes': result[8],
                    'last_updated': result[9]
                }
        
        return {'english_movies': 0, 'malayalam_movies': 0, 'english_tv_shows': 0, 'malayalam_tv_shows': 0}
    
    def get_recent_files(self, limit: int = 50) -> List[Dict]:
        """Get recent processed files for dashboard."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            results = conn.execute("""
                SELECT filename, type, language, processed_at, destination_path, file_size_readable, status, error_message
                FROM media_files 
                ORDER BY processed_at DESC 
                LIMIT ?
            """, (limit,)).fetchall()
            
            return [dict(row) for row in results]
    
    def backup_database(self, backup_path: str = None) -> str:
        """Create a backup of the database."""
        if backup_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"{self.db_path}.backup_{timestamp}"
        
        shutil.copy2(self.db_path, backup_path)
        logger.info(f"Database backed up to {backup_path}")
        return backup_path
    
    def restore_database(self, backup_path: str) -> bool:
        """Restore database from backup."""
        try:
            if os.path.exists(backup_path):
                # Create backup of current db first
                current_backup = self.backup_database()
                
                # Restore from backup
                shutil.copy2(backup_path, self.db_path)
                logger.info(f"Database restored from {backup_path}")
                logger.info(f"Previous database backed up to {current_backup}")
                return True
        except Exception as e:
            logger.error(f"Failed to restore database: {e}")
        return False
    
    def migrate_from_json(self, json_file_path: str) -> int:
        """Migrate existing JSON data to database."""
        if not os.path.exists(json_file_path):
            logger.warning(f"JSON file not found: {json_file_path}")
            return 0
        
        try:
            with open(json_file_path, 'r') as f:
                data = json.load(f)
            
            migrated_count = 0
            
            # Migrate file records
            for file_record in data.get('files', []):
                try:
                    # Standardize the record
                    record = {
                        'filename': file_record.get('name', ''),
                        'original_filename': file_record.get('name', ''),
                        'type': file_record.get('type', 'unknown'),
                        'language': file_record.get('language', 'unknown'),
                        'source_path': '',  # Not available in JSON
                        'destination_path': file_record.get('path', ''),
                        'file_size_readable': file_record.get('size', ''),
                        'processed_at': file_record.get('processedAt', datetime.now().isoformat()),
                        'status': file_record.get('status', 'success')
                    }
                    
                    # Parse series info from filename if TV show
                    if record['type'] == 'tvshow':
                        series_info = self._parse_series_info(record['filename'])
                        record.update(series_info)
                    
                    self.add_media_file(**record)
                    migrated_count += 1
                except Exception as e:
                    logger.error(f"Failed to migrate record {file_record}: {e}")
            
            logger.info(f"Migrated {migrated_count} records from JSON")
            return migrated_count
            
        except Exception as e:
            logger.error(f"Failed to migrate from JSON: {e}")
            return 0
    
    def _parse_series_info(self, filename: str) -> Dict:
        """Parse series name and episode info from filename."""
        import re
        
        # Common TV show patterns
        patterns = [
            r'^(.+?)\s+[Ss](\d+)[Ee](\d+)',  # Series S01E01
            r'^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)',  # Series Season 1 Episode 1
            r'^(.+?)\s+(\d+)x(\d+)',  # Series 1x01
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                series_name = match.group(1).strip()
                season_num = int(match.group(2))
                episode_num = int(match.group(3))
                
                return {
                    'series_name': series_name,
                    'season_number': season_num,
                    'episode_number': episode_num
                }
        
        return {}
    
    def export_statistics(self) -> Dict:
        """Export comprehensive statistics."""
        with sqlite3.connect(self.db_path) as conn:
            # Basic stats
            basic_stats = self.get_statistics()
            
            # Advanced analytics
            conn.row_factory = sqlite3.Row
            
            # Processing trends (last 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            daily_stats = conn.execute("""
                SELECT DATE(processed_at) as date, COUNT(*) as count, 
                       SUM(file_size_bytes) as total_size
                FROM media_files 
                WHERE processed_at >= ? AND status = 'success'
                GROUP BY DATE(processed_at)
                ORDER BY date
            """, (thirty_days_ago,)).fetchall()
            
            # Language distribution
            language_stats = conn.execute("""
                SELECT language, COUNT(*) as count, 
                       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM media_files WHERE status = 'success'), 2) as percentage
                FROM media_files 
                WHERE status = 'success'
                GROUP BY language
                ORDER BY count DESC
            """).fetchall()
            
            # Top series by episode count
            top_series = conn.execute("""
                SELECT series_name, COUNT(*) as episode_count, language
                FROM media_files 
                WHERE type = 'tvshow' AND status = 'success' AND series_name IS NOT NULL
                GROUP BY series_name, language
                ORDER BY episode_count DESC
                LIMIT 10
            """).fetchall()
            
            return {
                'basic_stats': basic_stats,
                'daily_processing': [dict(row) for row in daily_stats],
                'language_distribution': [dict(row) for row in language_stats],
                'top_series': [dict(row) for row in top_series],
                'generated_at': datetime.now().isoformat()
            }


# Database instance (singleton pattern)
_db_instance = None

def get_database() -> MediaDatabase:
    """Get database instance (singleton)."""
    global _db_instance
    if _db_instance is None:
        _db_instance = MediaDatabase()
    return _db_instance