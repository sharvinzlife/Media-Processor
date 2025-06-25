#!/usr/bin/env python3
"""
Database initialization and migration script for Media Processor.
Migrates existing JSON data and sets up the new SQLite database system.
"""

import os
import sys
import json
import logging
import sqlite3
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from modules.database.media_database import MediaDatabase, get_database
from modules.utils.logging_setup import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def migrate_existing_data():
    """Migrate data from existing JSON files to SQLite database."""
    db = get_database()
    
    # Paths to existing data files
    stats_json_path = os.path.join(project_root, 'web-app/api/stats.json')
    file_history_path = os.path.join(project_root, 'logs/file_history.json')
    
    total_migrated = 0
    
    # Migrate from web-app stats.json
    if os.path.exists(stats_json_path):
        logger.info(f"Migrating data from {stats_json_path}")
        count = db.migrate_from_json(stats_json_path)
        total_migrated += count
        logger.info(f"Migrated {count} records from stats.json")
    
    # Migrate from Python file_history.json if exists
    if os.path.exists(file_history_path):
        logger.info(f"Migrating data from {file_history_path}")
        count = db.migrate_from_json(file_history_path)
        total_migrated += count
        logger.info(f"Migrated {count} records from file_history.json")
    
    # Backup existing files
    if os.path.exists(stats_json_path):
        backup_path = f"{stats_json_path}.backup_{int(os.path.getmtime(stats_json_path))}"
        os.rename(stats_json_path, backup_path)
        logger.info(f"Backed up stats.json to {backup_path}")
    
    logger.info(f"Total records migrated: {total_migrated}")
    return total_migrated


def create_season_folder_mappings():
    """Create season folder mappings for existing TV shows."""
    db = get_database()
    
    # Get all TV shows from database
    with sqlite3.connect(db.db_path) as conn:
        tv_shows = conn.execute("""
            SELECT DISTINCT series_name, language, destination_path, season_number, episode_number
            FROM media_files 
            WHERE type = 'tvshow' AND series_name IS NOT NULL
            ORDER BY series_name, season_number
        """).fetchall()
    
    logger.info(f"Creating season folder mappings for {len(tv_shows)} TV show entries")
    
    # Group by series and create mappings
    series_groups = {}
    for show in tv_shows:
        series_name, language, dest_path, season_num, episode_num = show
        key = (db._normalize_series_name(series_name), language)
        
        if key not in series_groups:
            series_groups[key] = {
                'series_name': series_name,
                'language': language,
                'destination_path': dest_path,
                'seasons': set(),
                'total_episodes': 0
            }
        
        if season_num:
            series_groups[key]['seasons'].add(season_num)
        series_groups[key]['total_episodes'] += 1
    
    # Create or update season folder mappings
    for (normalized_name, language), info in series_groups.items():
        canonical_name = db._get_canonical_folder_name(info['series_name'])
        max_season = max(info['seasons']) if info['seasons'] else 1
        
        with sqlite3.connect(db.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO season_folders 
                (series_name_normalized, series_name_variations, canonical_folder_name, 
                 destination_path, language, total_seasons, total_episodes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                normalized_name,
                json.dumps([info['series_name']]),
                canonical_name,
                info['destination_path'],
                language,
                max_season,
                info['total_episodes']
            ))
        
        logger.info(f"Created mapping: {canonical_name} ({language}) -> {max_season} seasons, {info['total_episodes']} episodes")


def fix_kerala_crime_files_mapping():
    """Specifically fix the Kerala Crime Files duplicate folder issue."""
    db = get_database()
    
    # Find all Kerala Crime Files variations
    with sqlite3.connect(db.db_path) as conn:
        kerala_files = conn.execute("""
            SELECT id, filename, series_name, destination_path, season_number, episode_number
            FROM media_files 
            WHERE series_name LIKE '%Kerala Crime Files%' 
            ORDER BY processed_at
        """).fetchall()
    
    if kerala_files:
        logger.info(f"Found {len(kerala_files)} Kerala Crime Files entries")
        
        # Create unified mapping
        canonical_name = "Kerala Crime Files"
        normalized_name = db._normalize_series_name(canonical_name)
        
        # Find all variations
        variations = set()
        max_season = 0
        for file_record in kerala_files:
            _, filename, series_name, dest_path, season_num, episode_num = file_record
            variations.add(series_name)
            if season_num and season_num > max_season:
                max_season = season_num
        
        # Update season folder mapping
        with sqlite3.connect(db.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO season_folders 
                (series_name_normalized, series_name_variations, canonical_folder_name, 
                 destination_path, language, total_seasons, total_episodes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                normalized_name,
                json.dumps(list(variations)),
                canonical_name,
                "media/malayalam-tv-shows",
                "malayalam",
                max_season,
                len(kerala_files)
            ))
        
        logger.info(f"Created unified mapping for Kerala Crime Files:")
        logger.info(f"  Canonical name: {canonical_name}")
        logger.info(f"  Variations: {list(variations)}")
        logger.info(f"  Max season: {max_season}")
        logger.info(f"  Total episodes: {len(kerala_files)}")


def update_api_statistics():
    """Update web API to use database statistics."""
    db = get_database()
    stats = db.get_statistics()
    
    # Update stats.json with database values
    stats_json_path = os.path.join(project_root, 'web-app/api/stats.json')
    
    # Get recent files for compatibility
    recent_files = db.get_recent_files(50)
    
    # Convert to old format for compatibility
    legacy_stats = {
        'english_movies': stats['english_movies'],
        'malayalam_movies': stats['malayalam_movies'],
        'english_tv_shows': stats['english_tv_shows'],
        'malayalam_tv_shows': stats['malayalam_tv_shows'],
        'files': []
    }
    
    # Convert recent files to legacy format
    for file_record in recent_files:
        legacy_file = {
            'name': file_record['filename'],
            'type': file_record['type'],
            'language': file_record['language'],
            'processedAt': file_record['processed_at'],
            'path': file_record['destination_path'],
            'size': file_record['file_size_readable'] or '',
            'status': file_record['status']
        }
        legacy_stats['files'].append(legacy_file)
    
    # Write updated stats
    with open(stats_json_path, 'w') as f:
        json.dump(legacy_stats, f, indent=2)
    
    logger.info(f"Updated API statistics: {stats}")
    return stats


def verify_database_integrity():
    """Verify database integrity and consistency."""
    db = get_database()
    
    with sqlite3.connect(db.db_path) as conn:
        # Check basic counts
        total_files = conn.execute("SELECT COUNT(*) FROM media_files").fetchone()[0]
        total_series = conn.execute("SELECT COUNT(*) FROM season_folders").fetchone()[0]
        
        # Check statistics consistency
        stats = db.get_statistics()
        
        # Verify file counts match statistics
        actual_malayalam_movies = conn.execute(
            "SELECT COUNT(*) FROM media_files WHERE type = 'movie' AND language = 'malayalam' AND status = 'success'"
        ).fetchone()[0]
        
        actual_malayalam_tv = conn.execute(
            "SELECT COUNT(*) FROM media_files WHERE type = 'tvshow' AND language = 'malayalam' AND status = 'success'"
        ).fetchone()[0]
        
        logger.info("Database integrity check:")
        logger.info(f"  Total files: {total_files}")
        logger.info(f"  Total series mappings: {total_series}")
        logger.info(f"  Malayalam movies: {stats['malayalam_movies']} (actual: {actual_malayalam_movies})")
        logger.info(f"  Malayalam TV shows: {stats['malayalam_tv_shows']} (actual: {actual_malayalam_tv})")
        
        if stats['malayalam_movies'] == actual_malayalam_movies and stats['malayalam_tv_shows'] == actual_malayalam_tv:
            logger.info("✅ Database integrity verified")
            return True
        else:
            logger.warning("❌ Database statistics inconsistency detected")
            return False


def main():
    """Main initialization routine."""
    logger.info("🚀 Initializing Media Processor Database System")
    
    try:
        # Step 1: Initialize database schema
        logger.info("Step 1: Initializing database schema...")
        db = get_database()
        logger.info("✅ Database schema initialized")
        
        # Step 2: Migrate existing data
        logger.info("Step 2: Migrating existing data...")
        migrated_count = migrate_existing_data()
        logger.info(f"✅ Migrated {migrated_count} records")
        
        # Step 3: Create season folder mappings
        logger.info("Step 3: Creating season folder mappings...")
        create_season_folder_mappings()
        logger.info("✅ Season folder mappings created")
        
        # Step 4: Fix specific issues
        logger.info("Step 4: Fixing Kerala Crime Files mapping...")
        fix_kerala_crime_files_mapping()
        logger.info("✅ Kerala Crime Files mapping fixed")
        
        # Step 5: Update API statistics
        logger.info("Step 5: Updating API statistics...")
        stats = update_api_statistics()
        logger.info("✅ API statistics updated")
        
        # Step 6: Verify integrity
        logger.info("Step 6: Verifying database integrity...")
        integrity_ok = verify_database_integrity()
        
        if integrity_ok:
            logger.info("🎉 Database initialization completed successfully!")
            logger.info("📊 Current statistics:")
            for key, value in stats.items():
                if isinstance(value, int):
                    logger.info(f"   {key.replace('_', ' ').title()}: {value}")
        else:
            logger.error("❌ Database initialization completed with warnings")
        
        # Create backup
        backup_path = db.backup_database()
        logger.info(f"💾 Database backed up to: {backup_path}")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise


if __name__ == '__main__':
    main()