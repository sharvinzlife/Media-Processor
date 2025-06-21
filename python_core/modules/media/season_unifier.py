#!/usr/bin/env python3
"""
Season Folder Unification System for Media Processor.
Handles intelligent TV show season organization and folder structure unification.
"""

import os
import re
import json
import logging
import shutil
import sqlite3
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from ..database.media_database import get_database

logger = logging.getLogger(__name__)


class SeasonFolderUnifier:
    """Handles intelligent season folder organization and unification."""
    
    def __init__(self):
        self.db = get_database()
        
    def normalize_series_name(self, series_name: str) -> str:
        """Normalize series name for comparison."""
        # Remove year in parentheses
        normalized = re.sub(r'\s*\(\d{4}\)\s*', '', series_name)
        # Remove special characters and normalize spaces
        normalized = re.sub(r'[^\w\s]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip().lower()
        return normalized
    
    def extract_series_info(self, filename: str) -> Dict:
        """Extract series name, season, and episode from filename."""
        # Common TV show patterns
        patterns = [
            r'^(.+?)\s+[Ss](\d+)[Ee](\d+)',  # Series S01E01
            r'^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)',  # Series Season 1 Episode 1
            r'^(.+?)\s+(\d+)x(\d+)',  # Series 1x01
            r'^(.+?)\s+[Ss](\d+)\s+EP(\d+)',  # Series S01 EP01
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename, re.IGNORECASE)
            if match:
                series_name = match.group(1).strip()
                season_num = int(match.group(2))
                episode_num = int(match.group(3))
                
                return {
                    'series_name': series_name,
                    'season_number': season_num,
                    'episode_number': episode_num,
                    'normalized_name': self.normalize_series_name(series_name)
                }
        
        return {}
    
    def find_existing_series_folder(self, series_name: str, language: str, base_path: str) -> Optional[Dict]:
        """Find existing series folder that matches the given series name."""
        if not os.path.exists(base_path):
            return None
        
        normalized_target = self.normalize_series_name(series_name)
        
        # First check database for existing mapping
        mapping = self.db.get_season_folder_mapping(series_name, language)
        if mapping:
            canonical_path = os.path.join(base_path, mapping['canonical_folder_name'])
            if os.path.exists(canonical_path):
                return {
                    'path': canonical_path,
                    'canonical_name': mapping['canonical_folder_name'],
                    'existing_seasons': self._scan_existing_seasons(canonical_path),
                    'source': 'database'
                }
        
        # Scan filesystem for similar folders
        try:
            for item in os.listdir(base_path):
                item_path = os.path.join(base_path, item)
                if os.path.isdir(item_path):
                    normalized_existing = self.normalize_series_name(item)
                    
                    # Exact match or close match
                    if normalized_existing == normalized_target or self._is_close_match(normalized_existing, normalized_target):
                        existing_seasons = self._scan_existing_seasons(item_path)
                        return {
                            'path': item_path,
                            'canonical_name': item,
                            'existing_seasons': existing_seasons,
                            'source': 'filesystem'
                        }
        except OSError as e:
            logger.error(f"Error scanning directory {base_path}: {e}")
        
        return None
    
    def _is_close_match(self, name1: str, name2: str, threshold: float = 0.8) -> bool:
        """Check if two series names are close matches using similarity ratio."""
        # Simple similarity check based on word overlap
        words1 = set(name1.split())
        words2 = set(name2.split())
        
        if not words1 or not words2:
            return False
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = len(intersection) / len(union) if union else 0
        return similarity >= threshold
    
    def _scan_existing_seasons(self, series_path: str) -> List[int]:
        """Scan existing series folder for season numbers."""
        seasons = []
        
        try:
            for item in os.listdir(series_path):
                item_path = os.path.join(series_path, item)
                if os.path.isdir(item_path):
                    # Look for season patterns
                    season_match = re.search(r'[Ss]eason\s*(\d+)', item, re.IGNORECASE)
                    if season_match:
                        seasons.append(int(season_match.group(1)))
                    else:
                        # Check for simple "Season X" or "S0X" patterns
                        simple_match = re.search(r'^[Ss](\d+)$', item)
                        if simple_match:
                            seasons.append(int(simple_match.group(1)))
        except OSError as e:
            logger.error(f"Error scanning seasons in {series_path}: {e}")
        
        return sorted(seasons)
    
    def get_unified_destination_path(self, filename: str, language: str, base_path: str) -> Tuple[str, Dict]:
        """Get unified destination path for a TV show episode."""
        series_info = self.extract_series_info(filename)
        
        if not series_info:
            # Not a recognized TV show pattern
            return os.path.join(base_path, filename), {'unified': False, 'reason': 'no_series_pattern'}
        
        series_name = series_info['series_name']
        season_num = series_info['season_number']
        
        # Find existing series folder
        existing_folder = self.find_existing_series_folder(series_name, language, base_path)
        
        if existing_folder:
            # Use existing folder structure
            canonical_name = existing_folder['canonical_name']
            series_path = existing_folder['path']
            existing_seasons = existing_folder['existing_seasons']
            
            # Determine season folder name
            season_folder = f"Season {season_num:02d}"
            season_path = os.path.join(series_path, season_folder)
            
            logger.info(f"Unifying with existing series: {canonical_name}")
            logger.info(f"Existing seasons: {existing_seasons}")
            logger.info(f"Adding to season: {season_num}")
            
            return season_path, {
                'unified': True,
                'canonical_name': canonical_name,
                'existing_seasons': existing_seasons,
                'target_season': season_num,
                'series_path': series_path,
                'source': existing_folder['source']
            }
        else:
            # Create new series folder with clean name
            clean_series_name = self._get_clean_series_name(series_name)
            series_path = os.path.join(base_path, clean_series_name)
            season_folder = f"Season {season_num:02d}"
            season_path = os.path.join(series_path, season_folder)
            
            logger.info(f"Creating new series folder: {clean_series_name}")
            
            return season_path, {
                'unified': False,
                'canonical_name': clean_series_name,
                'existing_seasons': [],
                'target_season': season_num,
                'series_path': series_path,
                'source': 'new'
            }
    
    def _get_clean_series_name(self, series_name: str) -> str:
        """Get clean series name for folder creation."""
        # Remove common website prefixes
        clean_name = re.sub(r'^www\.\w+\.\w+\s*-\s*', '', series_name, flags=re.IGNORECASE)
        
        # Remove year in parentheses at the end
        clean_name = re.sub(r'\s*\(\d{4}\)\s*$', '', clean_name)
        
        # Clean up multiple spaces
        clean_name = re.sub(r'\s+', ' ', clean_name).strip()
        
        return clean_name
    
    def create_unified_folder_structure(self, destination_path: str, unification_info: Dict) -> bool:
        """Create the unified folder structure."""
        try:
            series_path = unification_info['series_path']
            target_season = unification_info['target_season']
            
            # Create series directory if it doesn't exist
            os.makedirs(series_path, exist_ok=True)
            
            # Create season directory
            season_folder = f"Season {target_season:02d}"
            season_path = os.path.join(series_path, season_folder)
            os.makedirs(season_path, exist_ok=True)
            
            # Create the final destination directory
            os.makedirs(destination_path, exist_ok=True)
            
            logger.info(f"Created unified folder structure: {destination_path}")
            return True
            
        except OSError as e:
            logger.error(f"Failed to create unified folder structure: {e}")
            return False
    
    def update_database_mapping(self, series_name: str, language: str, unification_info: Dict, 
                              season_num: int, episode_num: int):
        """Update database with season folder mapping information."""
        try:
            canonical_name = unification_info['canonical_name']
            series_path = unification_info['series_path']
            
            # Get or create season folder mapping
            existing_mapping = self.db.get_season_folder_mapping(series_name, language)
            
            if existing_mapping:
                # Update existing mapping
                with sqlite3.connect(self.db.db_path) as conn:
                    # Add this series name variation if not already present
                    variations = existing_mapping['name_variations']
                    if series_name not in variations:
                        variations.append(series_name)
                    
                    # Update totals
                    max_season = max(existing_mapping['total_seasons'], season_num)
                    total_episodes = existing_mapping['total_episodes'] + 1
                    
                    conn.execute("""
                        UPDATE season_folders 
                        SET series_name_variations = ?, total_seasons = ?, total_episodes = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE series_name_normalized = ? AND language = ?
                    """, (
                        json.dumps(variations),
                        max_season,
                        total_episodes,
                        self.normalize_series_name(series_name),
                        language
                    ))
            else:
                # Create new mapping
                with sqlite3.connect(self.db.db_path) as conn:
                    conn.execute("""
                        INSERT INTO season_folders 
                        (series_name_normalized, series_name_variations, canonical_folder_name, 
                         destination_path, language, total_seasons, total_episodes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        self.normalize_series_name(series_name),
                        json.dumps([series_name]),
                        canonical_name,
                        os.path.dirname(series_path),
                        language,
                        season_num,
                        1
                    ))
            
            logger.info(f"Updated database mapping for {canonical_name}")
            
        except Exception as e:
            logger.error(f"Failed to update database mapping: {e}")
    
    def suggest_folder_consolidation(self, base_path: str, language: str) -> List[Dict]:
        """Suggest folder consolidations for existing duplicate series."""
        suggestions = []
        
        if not os.path.exists(base_path):
            return suggestions
        
        try:
            # Group folders by normalized names
            folder_groups = {}
            
            for item in os.listdir(base_path):
                item_path = os.path.join(base_path, item)
                if os.path.isdir(item_path):
                    normalized = self.normalize_series_name(item)
                    
                    if normalized not in folder_groups:
                        folder_groups[normalized] = []
                    
                    folder_groups[normalized].append({
                        'name': item,
                        'path': item_path,
                        'seasons': self._scan_existing_seasons(item_path)
                    })
            
            # Find groups with multiple folders
            for normalized_name, folders in folder_groups.items():
                if len(folders) > 1:
                    # Suggest consolidation
                    primary_folder = max(folders, key=lambda f: len(f['seasons']) if f['seasons'] else 0)
                    other_folders = [f for f in folders if f != primary_folder]
                    
                    suggestions.append({
                        'normalized_name': normalized_name,
                        'primary_folder': primary_folder,
                        'duplicate_folders': other_folders,
                        'total_folders': len(folders),
                        'action': 'consolidate',
                        'language': language
                    })
        
        except OSError as e:
            logger.error(f"Error scanning for consolidation suggestions: {e}")
        
        return suggestions


# Global instance
_unifier_instance = None

def get_season_unifier() -> SeasonFolderUnifier:
    """Get season unifier instance (singleton)."""
    global _unifier_instance
    if _unifier_instance is None:
        _unifier_instance = SeasonFolderUnifier()
    return _unifier_instance