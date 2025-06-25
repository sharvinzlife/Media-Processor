#!/usr/bin/env python3
"""
Comprehensive Database Management System for Media Processor
Provides backup, restore, sync, migration, and health monitoring capabilities
"""

import os
import sys
import json
import sqlite3
import shutil
import logging
import hashlib
import tarfile
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Comprehensive database management system with backup, restore, and sync capabilities"""
    
    def __init__(self, db_path: str = None, backup_dir: str = None):
        """Initialize database manager"""
        self.project_root = Path(__file__).parent.parent
        
        # Database paths
        self.db_path = Path(db_path) if db_path else self.project_root / 'data' / 'media_processor.db'
        self.backup_dir = Path(backup_dir) if backup_dir else self.project_root / 'backups'
        
        # Legacy data sources
        self.stats_json_path = self.project_root / 'web-app' / 'api' / 'stats.json'
        self.file_history_path = self.project_root / 'logs' / 'file_history.json'
        
        # Ensure directories exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Database schema version for migrations
        self.schema_version = 1
        
        # Health monitoring
        self.health_stats = {
            'last_backup': None,
            'last_sync': None,
            'last_health_check': None,
            'database_size': 0,
            'record_count': 0,
            'errors': []
        }
        
    def initialize_database(self) -> bool:
        """Initialize database with proper schema"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("PRAGMA journal_mode = WAL")  # Better performance and concurrency
                
                # Main media files table
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
                        tracks_removed TEXT,
                        size_reduction_bytes INTEGER,
                        size_reduction_percent REAL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Statistics cache table
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
                
                # Season folder mapping
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS season_folders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        series_name_normalized TEXT NOT NULL,
                        series_name_variations TEXT,
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
                
                # Database metadata and health
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS database_metadata (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Backup history
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS backup_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        backup_path TEXT NOT NULL,
                        backup_type TEXT NOT NULL,
                        file_size_bytes INTEGER,
                        records_count INTEGER,
                        checksum TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status TEXT DEFAULT 'success'
                    )
                """)
                
                # Create indexes
                self._create_indexes(conn)
                
                # Initialize metadata
                conn.execute("INSERT OR REPLACE INTO database_metadata (key, value) VALUES ('schema_version', ?)", (str(self.schema_version),))
                conn.execute("INSERT OR IGNORE INTO statistics (id) VALUES (1)")
                
                conn.commit()
                
            logger.info(f"✅ Database initialized at {self.db_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            return False
    
    def _create_indexes(self, conn):
        """Create database indexes for performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_media_type_lang ON media_files(type, language)",
            "CREATE INDEX IF NOT EXISTS idx_media_processed_at ON media_files(processed_at)",
            "CREATE INDEX IF NOT EXISTS idx_media_status ON media_files(status)",
            "CREATE INDEX IF NOT EXISTS idx_media_series ON media_files(series_name, season_number)",
            "CREATE INDEX IF NOT EXISTS idx_media_hash ON media_files(file_hash)",
            "CREATE INDEX IF NOT EXISTS idx_season_folders_series ON season_folders(series_name_normalized)",
            "CREATE INDEX IF NOT EXISTS idx_backup_created_at ON backup_history(created_at)"
        ]
        
        for index_sql in indexes:
            conn.execute(index_sql)
    
    def create_backup(self, backup_type: str = 'manual', compress: bool = True) -> Optional[str]:
        """Create database backup with compression and verification"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"media_processor_backup_{timestamp}.db"
            
            if compress:
                backup_name += ".tar.gz"
            
            backup_path = self.backup_dir / backup_name
            
            # Create backup
            if compress:
                with tarfile.open(backup_path, 'w:gz') as tar:
                    tar.add(self.db_path, arcname=self.db_path.name)
                    
                    # Include related files
                    if self.stats_json_path.exists():
                        tar.add(self.stats_json_path, arcname='stats.json')
                    if self.file_history_path.exists():
                        tar.add(self.file_history_path, arcname='file_history.json')
            else:
                shutil.copy2(self.db_path, backup_path)
            
            # Calculate checksum
            checksum = self._calculate_file_checksum(backup_path)
            
            # Get database stats
            with sqlite3.connect(self.db_path) as conn:
                record_count = conn.execute("SELECT COUNT(*) FROM media_files").fetchone()[0]
            
            file_size = backup_path.stat().st_size
            
            # Record backup in history
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO backup_history 
                    (backup_path, backup_type, file_size_bytes, records_count, checksum) 
                    VALUES (?, ?, ?, ?, ?)
                """, (str(backup_path), backup_type, file_size, record_count, checksum))
                conn.commit()
            
            # Update health stats
            self.health_stats['last_backup'] = datetime.now().isoformat()
            
            logger.info(f"✅ Backup created: {backup_path}")
            logger.info(f"   Size: {self._format_size(file_size)}")
            logger.info(f"   Records: {record_count}")
            logger.info(f"   Checksum: {checksum}")
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"❌ Failed to create backup: {e}")
            self.health_stats['errors'].append(f"Backup failed: {e}")
            return None
    
    def restore_backup(self, backup_path: str, verify_checksum: bool = True) -> bool:
        """Restore database from backup with verification"""
        try:
            backup_file = Path(backup_path)
            
            if not backup_file.exists():
                logger.error(f"❌ Backup file not found: {backup_path}")
                return False
            
            # Verify checksum if requested
            if verify_checksum:
                stored_checksum = self._get_backup_checksum(backup_path)
                current_checksum = self._calculate_file_checksum(backup_file)
                
                if stored_checksum and stored_checksum != current_checksum:
                    logger.error(f"❌ Backup checksum mismatch! Stored: {stored_checksum}, Current: {current_checksum}")
                    return False
            
            # Create current backup before restoring
            current_backup = self.create_backup('pre_restore')
            logger.info(f"📦 Created safety backup: {current_backup}")
            
            # Restore database
            if backup_file.suffix == '.gz':
                # Extract from compressed backup
                with tarfile.open(backup_file, 'r:gz') as tar:
                    # Extract database
                    tar.extract(self.db_path.name, path=self.db_path.parent)
                    
                    # Extract additional files if present
                    try:
                        tar.extract('stats.json', path=self.stats_json_path.parent)
                        tar.extract('file_history.json', path=self.file_history_path.parent)
                    except KeyError:
                        pass  # Files not in backup
            else:
                # Direct copy
                shutil.copy2(backup_file, self.db_path)
            
            # Verify restored database
            if self._verify_database_integrity():
                logger.info(f"✅ Database restored successfully from {backup_path}")
                return True
            else:
                logger.error(f"❌ Restored database failed integrity check")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to restore backup: {e}")
            return False
    
    def sync_data_sources(self) -> bool:
        """Sync data from all sources (JSON files, existing database)"""
        try:
            self.health_stats['last_sync'] = datetime.now().isoformat()
            sync_count = 0
            
            # Sync from stats.json
            if self.stats_json_path.exists():
                sync_count += self._sync_from_stats_json()
            
            # Sync from file_history.json
            if self.file_history_path.exists():
                sync_count += self._sync_from_file_history()
            
            # Update statistics
            self._update_statistics()
            
            logger.info(f"✅ Synced {sync_count} records from data sources")
            return True
            
        except Exception as e:
            logger.error(f"❌ Data sync failed: {e}")
            self.health_stats['errors'].append(f"Sync failed: {e}")
            return False
    
    def _sync_from_stats_json(self) -> int:
        """Sync data from stats.json file"""
        try:
            with open(self.stats_json_path, 'r') as f:
                data = json.load(f)
            
            sync_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                for file_record in data.get('files', []):
                    # Generate unique hash
                    file_hash = hashlib.md5(
                        f"{file_record.get('name', '')}:{file_record.get('path', '')}".encode()
                    ).hexdigest()
                    
                    # Check if already exists
                    existing = conn.execute("SELECT id FROM media_files WHERE file_hash = ?", (file_hash,)).fetchone()
                    if existing:
                        continue
                    
                    # Parse series info for TV shows
                    series_info = self._parse_series_info(file_record.get('name', ''))
                    
                    # Insert record
                    conn.execute("""
                        INSERT INTO media_files 
                        (filename, original_filename, file_hash, type, language, series_name, 
                         season_number, episode_number, source_path, destination_path, 
                         file_size_readable, processed_at, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        file_record.get('name', ''),
                        file_record.get('name', ''),
                        file_hash,
                        file_record.get('type', 'unknown'),
                        file_record.get('language', 'unknown'),
                        series_info.get('series_name'),
                        series_info.get('season_number'),
                        series_info.get('episode_number'),
                        '',  # source_path not available
                        file_record.get('path', ''),
                        file_record.get('size', ''),
                        file_record.get('processedAt', datetime.now().isoformat()),
                        file_record.get('status', 'success')
                    ))
                    sync_count += 1
                
                conn.commit()
            
            return sync_count
            
        except Exception as e:
            logger.error(f"Failed to sync from stats.json: {e}")
            return 0
    
    def _sync_from_file_history(self) -> int:
        """Sync data from file_history.json file"""
        try:
            with open(self.file_history_path, 'r') as f:
                history = json.load(f)
            
            if not isinstance(history, list):
                return 0
            
            sync_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                for record in history:
                    # Generate unique hash
                    file_hash = hashlib.md5(
                        f"{record.get('name', '')}:{record.get('path', '')}".encode()
                    ).hexdigest()
                    
                    # Check if already exists
                    existing = conn.execute("SELECT id FROM media_files WHERE file_hash = ?", (file_hash,)).fetchone()
                    if existing:
                        continue
                    
                    # Parse series info
                    series_info = self._parse_series_info(record.get('name', ''))
                    
                    # Insert record
                    conn.execute("""
                        INSERT INTO media_files 
                        (filename, original_filename, file_hash, type, language, series_name, 
                         season_number, episode_number, source_path, destination_path, 
                         file_size_readable, processed_at, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        record.get('name', ''),
                        record.get('name', ''),
                        file_hash,
                        record.get('type', 'unknown'),
                        record.get('language', 'unknown'),
                        series_info.get('series_name'),
                        series_info.get('season_number'),
                        series_info.get('episode_number'),
                        '',
                        record.get('path', ''),
                        record.get('size', ''),
                        record.get('timestamp', datetime.now().isoformat()),
                        record.get('status', 'success')
                    ))
                    sync_count += 1
                
                conn.commit()
            
            return sync_count
            
        except Exception as e:
            logger.error(f"Failed to sync from file_history.json: {e}")
            return 0
    
    def _parse_series_info(self, filename: str) -> Dict:
        """Parse series information from filename"""
        import re
        
        patterns = [
            r'^(.+?)\s+[Ss](\d+)[Ee](\d+)',  # Series S01E01
            r'^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)',  # Series Season 1 Episode 1
            r'^(.+?)\s+(\d+)x(\d+)',  # Series 1x01
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                return {
                    'series_name': match.group(1).strip(),
                    'season_number': int(match.group(2)),
                    'episode_number': int(match.group(3))
                }
        
        return {}
    
    def _update_statistics(self):
        """Update statistics cache from current data"""
        with sqlite3.connect(self.db_path) as conn:
            stats = {}
            
            # Count by type and language
            for media_type in ['movie', 'tvshow']:
                for language in ['english', 'malayalam', 'hindi']:
                    count = conn.execute(
                        "SELECT COUNT(*) FROM media_files WHERE type = ? AND language = ? AND status = 'success'",
                        (media_type, language)
                    ).fetchone()[0]
                    
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
            
            # Update statistics table
            set_clause = ', '.join([f"{key} = ?" for key in stats.keys()])
            conn.execute(
                f"UPDATE statistics SET {set_clause}, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
                list(stats.values())
            )
            conn.commit()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get current statistics"""
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("""
                SELECT english_movies, malayalam_movies, english_tv_shows, malayalam_tv_shows,
                       hindi_movies, hindi_tv_shows, total_files_processed, total_size_processed_bytes,
                       last_updated
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
                    'last_updated': result[8]
                }
        
        return {'english_movies': 0, 'malayalam_movies': 0, 'english_tv_shows': 0, 'malayalam_tv_shows': 0}
    
    def export_statistics_to_json(self) -> bool:
        """Export current statistics to stats.json for web interface compatibility"""
        try:
            stats = self.get_statistics()
            recent_files = self.get_recent_files(50)
            
            # Convert to web interface format
            web_stats = {
                'english_movies': stats['english_movies'],
                'malayalam_movies': stats['malayalam_movies'],
                'english_tv_shows': stats['english_tv_shows'],
                'malayalam_tv_shows': stats['malayalam_tv_shows'],
                'files': []
            }
            
            # Convert recent files
            for file_record in recent_files:
                web_file = {
                    'name': file_record['filename'],
                    'type': file_record['type'],
                    'language': file_record['language'],
                    'processedAt': file_record['processed_at'],
                    'path': file_record['destination_path'],
                    'size': file_record['file_size_readable'] or '',
                    'status': file_record['status']
                }
                web_stats['files'].append(web_file)
            
            # Write to stats.json
            with open(self.stats_json_path, 'w') as f:
                json.dump(web_stats, f, indent=2)
            
            logger.info(f"✅ Exported statistics to {self.stats_json_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to export statistics: {e}")
            return False
    
    def get_recent_files(self, limit: int = 50) -> List[Dict]:
        """Get recent processed files"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            results = conn.execute("""
                SELECT filename, type, language, processed_at, destination_path, 
                       file_size_readable, status, error_message
                FROM media_files 
                ORDER BY processed_at DESC 
                LIMIT ?
            """, (limit,)).fetchall()
            
            return [dict(row) for row in results]
    
    def _verify_database_integrity(self) -> bool:
        """Verify database integrity"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # PRAGMA integrity_check
                result = conn.execute("PRAGMA integrity_check").fetchone()
                if result[0] != 'ok':
                    logger.error(f"Database integrity check failed: {result[0]}")
                    return False
                
                # Check essential tables exist
                tables = ['media_files', 'statistics', 'season_folders', 'database_metadata']
                for table in tables:
                    count = conn.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{table}'").fetchone()[0]
                    if count == 0:
                        logger.error(f"Essential table missing: {table}")
                        return False
                
                return True
                
        except Exception as e:
            logger.error(f"Database integrity check failed: {e}")
            return False
    
    def _calculate_file_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _get_backup_checksum(self, backup_path: str) -> Optional[str]:
        """Get stored checksum for backup"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                result = conn.execute(
                    "SELECT checksum FROM backup_history WHERE backup_path = ? ORDER BY created_at DESC LIMIT 1",
                    (backup_path,)
                ).fetchone()
                return result[0] if result else None
        except:
            return None
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive database health check"""
        try:
            health = {
                'database_exists': self.db_path.exists(),
                'database_readable': False,
                'database_writable': False,
                'integrity_ok': False,
                'size_mb': 0,
                'record_count': 0,
                'last_backup_age_hours': None,
                'backup_count': 0,
                'errors': []
            }
            
            if health['database_exists']:
                # Check readability
                try:
                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute("SELECT 1").fetchone()
                    health['database_readable'] = True
                except Exception as e:
                    health['errors'].append(f"Database not readable: {e}")
                
                # Check writability
                try:
                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute("UPDATE statistics SET last_updated = CURRENT_TIMESTAMP WHERE id = 1")
                        conn.commit()
                    health['database_writable'] = True
                except Exception as e:
                    health['errors'].append(f"Database not writable: {e}")
                
                # Check integrity
                health['integrity_ok'] = self._verify_database_integrity()
                
                # Get size and record count
                health['size_mb'] = round(self.db_path.stat().st_size / (1024 * 1024), 2)
                
                try:
                    with sqlite3.connect(self.db_path) as conn:
                        health['record_count'] = conn.execute("SELECT COUNT(*) FROM media_files").fetchone()[0]
                        
                        # Check last backup
                        last_backup = conn.execute(
                            "SELECT created_at FROM backup_history ORDER BY created_at DESC LIMIT 1"
                        ).fetchone()
                        
                        if last_backup:
                            last_backup_time = datetime.fromisoformat(last_backup[0])
                            age = datetime.now() - last_backup_time
                            health['last_backup_age_hours'] = round(age.total_seconds() / 3600, 1)
                        
                        health['backup_count'] = conn.execute("SELECT COUNT(*) FROM backup_history").fetchone()[0]
                        
                except Exception as e:
                    health['errors'].append(f"Error getting database stats: {e}")
            
            self.health_stats['last_health_check'] = datetime.now().isoformat()
            self.health_stats.update(health)
            
            return health
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {'errors': [f"Health check failed: {e}"]}
    
    def auto_backup_daemon(self, interval_hours: int = 6):
        """Run automatic backup daemon"""
        def backup_worker():
            while True:
                try:
                    logger.info("🤖 Running automatic backup...")
                    backup_path = self.create_backup('auto')
                    if backup_path:
                        logger.info(f"✅ Auto backup completed: {backup_path}")
                    else:
                        logger.error("❌ Auto backup failed")
                    
                    # Clean old backups (keep last 10 auto backups)
                    self._cleanup_old_backups('auto', keep_count=10)
                    
                except Exception as e:
                    logger.error(f"Auto backup error: {e}")
                
                # Wait for next interval
                time.sleep(interval_hours * 3600)
        
        # Start daemon thread
        backup_thread = threading.Thread(target=backup_worker, daemon=True)
        backup_thread.start()
        logger.info(f"🤖 Auto backup daemon started (interval: {interval_hours}h)")
    
    def _cleanup_old_backups(self, backup_type: str, keep_count: int = 10):
        """Clean up old backups, keeping only the most recent ones"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                old_backups = conn.execute("""
                    SELECT backup_path FROM backup_history 
                    WHERE backup_type = ? 
                    ORDER BY created_at DESC 
                    OFFSET ?
                """, (backup_type, keep_count)).fetchall()
                
                for (backup_path,) in old_backups:
                    backup_file = Path(backup_path)
                    if backup_file.exists():
                        backup_file.unlink()
                        logger.info(f"🗑️  Cleaned up old backup: {backup_path}")
                    
                    # Remove from history
                    conn.execute("DELETE FROM backup_history WHERE backup_path = ?", (backup_path,))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")


def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Manager for Media Processor")
    parser.add_argument('action', choices=['init', 'backup', 'restore', 'sync', 'health', 'export', 'daemon'])
    parser.add_argument('--backup-path', help="Path to backup file for restore")
    parser.add_argument('--compress', action='store_true', help="Compress backup")
    parser.add_argument('--interval', type=int, default=6, help="Backup interval in hours for daemon")
    
    args = parser.parse_args()
    
    db_manager = DatabaseManager()
    
    if args.action == 'init':
        if db_manager.initialize_database():
            print("✅ Database initialized successfully")
        else:
            print("❌ Database initialization failed")
            sys.exit(1)
    
    elif args.action == 'backup':
        backup_path = db_manager.create_backup('manual', compress=args.compress)
        if backup_path:
            print(f"✅ Backup created: {backup_path}")
        else:
            print("❌ Backup failed")
            sys.exit(1)
    
    elif args.action == 'restore':
        if not args.backup_path:
            print("❌ --backup-path required for restore")
            sys.exit(1)
        
        if db_manager.restore_backup(args.backup_path):
            print("✅ Database restored successfully")
        else:
            print("❌ Database restore failed")
            sys.exit(1)
    
    elif args.action == 'sync':
        if db_manager.sync_data_sources():
            print("✅ Data sync completed")
        else:
            print("❌ Data sync failed")
            sys.exit(1)
    
    elif args.action == 'health':
        health = db_manager.health_check()
        print("🏥 Database Health Check:")
        for key, value in health.items():
            if key == 'errors' and value:
                print(f"  ❌ Errors: {', '.join(value)}")
            elif key != 'errors':
                status = "✅" if (isinstance(value, bool) and value) or (isinstance(value, (int, float)) and value > 0) else "⚠️"
                print(f"  {status} {key.replace('_', ' ').title()}: {value}")
    
    elif args.action == 'export':
        if db_manager.export_statistics_to_json():
            print("✅ Statistics exported to JSON")
        else:
            print("❌ Export failed")
            sys.exit(1)
    
    elif args.action == 'daemon':
        print(f"🤖 Starting auto backup daemon (interval: {args.interval}h)")
        db_manager.auto_backup_daemon(args.interval)
        try:
            while True:
                time.sleep(60)  # Keep main thread alive
        except KeyboardInterrupt:
            print("\n🛑 Daemon stopped")


if __name__ == '__main__':
    main()