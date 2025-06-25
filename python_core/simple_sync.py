#!/usr/bin/env python3
"""
Simple Stats Sync
Updates stats.json with a new Malayalam movie entry for testing
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

def add_malayalam_movie():
    """Add the Malayalam movie that was manually added"""
    
    stats_path = Path(__file__).parent.parent / 'web-app' / 'api' / 'stats.json'
    
    # Load existing stats
    try:
        with open(stats_path, 'r') as f:
            stats = json.load(f)
    except Exception as e:
        print(f"Error loading stats: {e}")
        return False
    
    # Check if the Malayalam movie already exists
    malayalam_movie_name = "Sthanarthi Sreekuttan"
    existing = any(
        malayalam_movie_name.lower() in file.get('name', '').lower()
        for file in stats.get('files', [])
    )
    
    if existing:
        print(f"Malayalam movie '{malayalam_movie_name}' already exists in stats")
        return False
    
    # Add the new Malayalam movie
    new_movie = {
        "name": "Sthanarthi.Sreekuttan.2024.1080p.WEB-DL.Malayalam.mkv",
        "type": "movie",
        "language": "malayalam",
        "processedAt": (datetime.now() - timedelta(minutes=5)).isoformat() + "+00:00",
        "path": "media/malayalam movies/Sthanarthi Sreekuttan (2024)/Sthanarthi Sreekuttan (2024).1080p.Malayalam.mkv",
        "size": "2.8GB",
        "status": "found"
    }
    
    # Insert at the beginning of files list
    stats['files'].insert(0, new_movie)
    
    # Update Malayalam movies count
    stats['malayalam_movies'] = stats.get('malayalam_movies', 0) + 1
    
    # Save updated stats
    try:
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        print(f"✅ Added Malayalam movie '{malayalam_movie_name}' to stats")
        print(f"📊 Malayalam movies count: {stats['malayalam_movies']}")
        return True
    except Exception as e:
        print(f"❌ Error saving stats: {e}")
        return False

if __name__ == '__main__':
    print("🎬 Adding Malayalam movie to stats...")
    success = add_malayalam_movie()
    if success:
        print("✅ Update completed successfully")
    else:
        print("❌ Update failed")