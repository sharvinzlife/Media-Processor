#!/usr/bin/env python3
"""Configuration management for Media Processor"""

import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ConfigManager:
    """Handles configuration loading and management"""
    
    def __init__(self, config_path: str = None):
        """Initialize configuration manager"""
        self.config_path = config_path or self._get_default_config_path()
        self.config = self._load_default_config()
        
    def _get_default_config_path(self) -> str:
        """Get default configuration file path"""
        return os.path.join(os.path.dirname(__file__), '..', '..', 'config.json')
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            "download_dir": "/home/sharvinzlife/Documents/JDownloader/",
            "log_file": "/var/lib/media-processor/media_processor_py.log",
            "file_history_path": "/var/lib/media-processor/file_history.json",
            "monitoring_interval_seconds": 60,
            "smb_server": "streamwave.local",
            "smb_share": "Data-Streamwave",
            "smb_username": "sharvinzlife",
            "smb_password": "",
            "smb_domain": "",
            "clean_original_files": True,
            "cleanup_rar_files": True,
            "dry_run": False,
            "media_extensions": [".mkv", ".mp4", ".avi"],
            "api_base_url": "http://localhost:5001",
            "dashboard_api_enabled": True,
            "malayalam_movie_path": "media/malayalam movies",
            "malayalam_tv_path": "media/malayalam-tv-shows",
            "english_movie_path": "media/movies",
            "english_tv_path": "media/tv-shows"
        }
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from file or return defaults"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    file_config = json.load(f)
                    # Merge with defaults
                    self.config.update(file_config)
                    logger.info(f"Configuration loaded from {self.config_path}")
            except Exception as e:
                logger.warning(f"Error loading config file {self.config_path}: {e}")
                logger.info("Using default configuration")
        else:
            logger.info("No config file found, using defaults")
            
        return self.config
    
    def save_config(self, config: Dict[str, Any]) -> bool:
        """Save configuration to file"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            logger.info(f"Configuration saved to {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving config: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set configuration value"""
        self.config[key] = value
    
    def update(self, updates: Dict[str, Any]) -> None:
        """Update multiple configuration values"""
        self.config.update(updates)