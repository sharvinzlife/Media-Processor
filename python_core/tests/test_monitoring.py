#!/usr/bin/env python3
"""Test monitoring functionality with enhanced debug logging"""

import os
import sys
import time
import logging
from datetime import datetime

# Add modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from config.settings import ConfigManager
from utils.logging_setup import setup_logging, get_logger

def test_monitoring():
    """Test the monitoring functionality with debug output"""
    
    # Set up logging to console for immediate feedback
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    logger = get_logger("TestMonitoring")
    
    print(f"🔧 Starting monitoring test at {datetime.now()}")
    print("=" * 60)
    
    # Load configuration
    config_manager = ConfigManager()
    config = config_manager.get_config()
    
    download_dir = config.get("download_dir")
    monitoring_interval = config.get("monitoring_interval_seconds", 60)
    media_extensions = tuple(config.get("media_extensions", [".mkv", ".mp4", ".avi"]))
    
    print(f"📁 Download directory: {download_dir}")
    print(f"⏱️  Monitoring interval: {monitoring_interval} seconds")
    print(f"🎬 Media extensions: {', '.join(media_extensions)}")
    print(f"📂 Directory exists: {os.path.exists(download_dir) if download_dir else False}")
    print(f"📂 Is directory: {os.path.isdir(download_dir) if download_dir else False}")
    
    if not download_dir or not os.path.isdir(download_dir):
        print(f"❌ Invalid download directory: {download_dir}")
        return
    
    # Perform one scan cycle
    print(f"\n🔍 Starting scan cycle...")
    logger.info(f"Scanning {download_dir} for new media files...")
    
    found_files = 0
    
    for root, dirs, files in os.walk(download_dir):
        depth = root.replace(download_dir, '').count(os.sep)
        print(f"📂 Scanning directory (depth {depth}): {root}")
        logger.info(f"Scanning directory (depth {depth}): {root}")
        
        for filename in files:
            if filename.lower().endswith(media_extensions):
                file_path = os.path.join(root, filename)
                found_files += 1
                print(f"🎬 Found media file: {filename}")
                logger.info(f"Found potential media file: {file_path}")
    
    print(f"\n📊 Scan complete. Found {found_files} media files total.")
    logger.info(f"Scan complete. Found {found_files} potential files this cycle.")
    
    # Check if we can write to log file
    log_file = config.get("log_file", "/var/lib/media-processor/media_processor_py.log")
    print(f"\n📝 Log file path: {log_file}")
    print(f"📝 Log file exists: {os.path.exists(log_file)}")
    
    if os.path.exists(log_file):
        try:
            with open(log_file, 'a') as f:
                f.write(f"\nTest log entry from test_monitoring.py at {datetime.now()}\n")
            print(f"✅ Successfully wrote to log file")
        except Exception as e:
            print(f"❌ Cannot write to log file: {e}")
    else:
        print(f"❌ Log file does not exist")
        # Try to create it
        try:
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            with open(log_file, 'w') as f:
                f.write(f"Test log file created at {datetime.now()}\n")
            print(f"✅ Created log file successfully")
        except Exception as e:
            print(f"❌ Cannot create log file: {e}")

if __name__ == "__main__":
    test_monitoring()