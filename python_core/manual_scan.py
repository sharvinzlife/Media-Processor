#!/usr/bin/env python3
"""
Manual Scanner for Media Files
Scans SMB share to detect manually added files and sync them with the database
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

# Add modules path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.config.settings import ConfigManager
from modules.media.detector import MediaDetector
from database_manager import DatabaseManager

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ManualScanner:
    def __init__(self):
        self.config = ConfigManager()
        self.detector = MediaDetector()
        self.db_manager = DatabaseManager()
        self.stats_path = Path(__file__).parent.parent / 'web-app' / 'api' / 'stats.json'
        
    def scan_smb_share(self):
        """Scan SMB share for manually added files"""
        logger.info("🔍 Starting manual SMB share scan...")
        
        try:
            # Get SMB configuration
            smb_server = self.config.get('SMB_SERVER')
            smb_share = self.config.get('SMB_SHARE')
            smb_username = self.config.get('SMB_USERNAME')
            smb_password = self.config.get('SMB_PASSWORD')
            
            if not all([smb_server, smb_share, smb_username, smb_password]):
                logger.error("❌ SMB configuration incomplete")
                return []
            
            # Mount SMB share temporarily
            mount_point = "/tmp/media_scanner_mount"
            os.makedirs(mount_point, exist_ok=True)
            
            # Mount command
            mount_cmd = [
                'sudo', 'mount', '-t', 'cifs',
                f'//{smb_server}/{smb_share}',
                mount_point,
                '-o', f'username={smb_username},password={smb_password},uid={os.getuid()},gid={os.getgid()}'
            ]
            
            logger.info("📂 Mounting SMB share...")
            result = subprocess.run(mount_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"❌ Failed to mount SMB share: {result.stderr}")
                return []
            
            # Scan for media files
            media_files = []
            media_paths = [
                'media/movies',
                'media/malayalam movies', 
                'media/malayalam-tv-shows',
                'media/tv-shows',
                'media/bollywood movies',
                'media/bollywood tv-shows'
            ]
            
            for media_path in media_paths:
                full_path = os.path.join(mount_point, media_path)
                if os.path.exists(full_path):
                    logger.info(f"🔍 Scanning {media_path}...")
                    files = self._scan_directory(full_path, media_path)
                    media_files.extend(files)
            
            # Unmount
            subprocess.run(['sudo', 'umount', mount_point], capture_output=True)
            os.rmdir(mount_point)
            
            logger.info(f"✅ Found {len(media_files)} media files")
            return media_files
            
        except Exception as e:
            logger.error(f"❌ Error scanning SMB share: {e}")
            return []
    
    def _scan_directory(self, directory, relative_path):
        """Recursively scan directory for media files"""
        media_files = []
        media_extensions = ['.mkv', '.mp4', '.avi', '.mov', '.m4v']
        
        try:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    if any(file.lower().endswith(ext) for ext in media_extensions):
                        file_path = os.path.join(root, file)
                        relative_file_path = os.path.relpath(file_path, directory)
                        
                        # Get file info
                        stat = os.stat(file_path)
                        
                        media_info = {
                            'filename': file,
                            'path': os.path.join(relative_path, relative_file_path),
                            'size_bytes': stat.st_size,
                            'size_readable': self._format_size(stat.st_size),
                            'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'detected_type': None,
                            'detected_language': None
                        }
                        
                        # Detect media type and language
                        detection = self.detector.detect_media_type(file)
                        if detection:
                            media_info['detected_type'] = detection.get('type', 'unknown')
                            media_info['detected_language'] = detection.get('language', 'unknown')
                        
                        # Infer from path
                        if 'malayalam' in relative_path.lower():
                            media_info['detected_language'] = 'malayalam'
                        elif 'bollywood' in relative_path.lower():
                            media_info['detected_language'] = 'hindi'
                        elif 'movies' in relative_path.lower():
                            media_info['detected_type'] = 'movie'
                        elif 'tv' in relative_path.lower():
                            media_info['detected_type'] = 'tvshow'
                        
                        media_files.append(media_info)
                        
        except Exception as e:
            logger.error(f"❌ Error scanning directory {directory}: {e}")
        
        return media_files
    
    def sync_found_files(self, media_files):
        """Sync found files with database and stats"""
        logger.info(f"🔄 Syncing {len(media_files)} files with database...")
        
        # Load existing stats
        existing_stats = self._load_stats()
        
        # Track new files
        new_files = []
        updated_stats = {
            'english_movies': existing_stats.get('english_movies', 0),
            'malayalam_movies': existing_stats.get('malayalam_movies', 0),
            'english_tv_shows': existing_stats.get('english_tv_shows', 0),
            'malayalam_tv_shows': existing_stats.get('malayalam_tv_shows', 0),
            'files': existing_stats.get('files', [])
        }
        
        for file_info in media_files:
            # Check if file already exists in stats
            existing = any(
                f.get('name') == file_info['filename'] or 
                f.get('path') == file_info['path']
                for f in updated_stats['files']
            )
            
            if not existing:
                # Add new file
                new_file = {
                    'name': file_info['filename'],
                    'type': file_info['detected_type'] or 'movie',
                    'language': file_info['detected_language'] or 'unknown',
                    'processedAt': file_info['modified_time'],
                    'path': file_info['path'],
                    'size': file_info['size_readable'],
                    'status': 'found'  # Different status to indicate manual discovery
                }
                
                new_files.append(new_file)
                updated_stats['files'].insert(0, new_file)  # Add to beginning
                
                # Update counts
                if new_file['type'] == 'movie':
                    if new_file['language'] == 'malayalam':
                        updated_stats['malayalam_movies'] += 1
                    elif new_file['language'] == 'english':
                        updated_stats['english_movies'] += 1
                elif new_file['type'] == 'tvshow':
                    if new_file['language'] == 'malayalam':
                        updated_stats['malayalam_tv_shows'] += 1
                    elif new_file['language'] == 'english':
                        updated_stats['english_tv_shows'] += 1
        
        # Save updated stats
        if new_files:
            self._save_stats(updated_stats)
            logger.info(f"✅ Added {len(new_files)} new files to database")
            
            # Sync with database manager
            try:
                self.db_manager.sync_data_sources()
                self.db_manager.export_statistics_to_json()
                logger.info("✅ Database synced successfully")
            except Exception as e:
                logger.error(f"⚠️  Database sync failed: {e}")
            
            return new_files
        else:
            logger.info("ℹ️  No new files found")
            return []
    
    def _load_stats(self):
        """Load existing stats"""
        try:
            if self.stats_path.exists():
                with open(self.stats_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading stats: {e}")
        
        return {
            'english_movies': 0,
            'malayalam_movies': 0,
            'english_tv_shows': 0,
            'malayalam_tv_shows': 0,
            'files': []
        }
    
    def _save_stats(self, stats):
        """Save updated stats"""
        try:
            self.stats_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.stats_path, 'w') as f:
                json.dump(stats, f, indent=2)
            logger.info(f"✅ Stats saved to {self.stats_path}")
        except Exception as e:
            logger.error(f"❌ Error saving stats: {e}")
    
    def _format_size(self, size_bytes):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f}PB"

def main():
    """Main function"""
    print("🔍 Media Processor Manual Scanner")
    print("=" * 40)
    
    scanner = ManualScanner()
    
    # Scan SMB share
    media_files = scanner.scan_smb_share()
    
    if media_files:
        print(f"\n📁 Found {len(media_files)} media files:")
        for file_info in media_files[:10]:  # Show first 10
            print(f"  • {file_info['filename']} ({file_info['detected_language']} {file_info['detected_type']})")
        
        if len(media_files) > 10:
            print(f"  ... and {len(media_files) - 10} more files")
        
        # Sync with database
        new_files = scanner.sync_found_files(media_files)
        
        if new_files:
            print(f"\n✅ Added {len(new_files)} new files to database")
        else:
            print("\nℹ️  All files already in database")
    else:
        print("\n❌ No media files found or scan failed")

if __name__ == '__main__':
    main()