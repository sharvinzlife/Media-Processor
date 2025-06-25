#!/usr/bin/env python3
"""Configuration management for Media Processor"""

import os
import json
import logging
from typing import Dict, Any

try:
    from dotenv import load_dotenv
except ImportError:
    print("Warning: python-dotenv not installed. Install with: pip install python-dotenv")
    load_dotenv = None

logger = logging.getLogger(__name__)

class ConfigManager:
    """Handles configuration loading and management"""
    
    def __init__(self, config_path: str = None):
        """Initialize configuration manager"""
        self.config_path = config_path or self._get_default_config_path()
        self.config = self._load_default_config()
        
        # Load .env file from project root
        self._load_env_file()
        
        # Override with environment variables
        self._load_from_env()
        
    def _get_default_config_path(self) -> str:
        """Get default configuration file path"""
        return os.path.join(os.path.dirname(__file__), '..', '..', 'config.json')
    
    def _load_env_file(self) -> None:
        """Load environment variables from .env file"""
        if load_dotenv is None:
            return
            
        # Try to find .env file in project root
        project_root = os.path.join(os.path.dirname(__file__), '..', '..', '..')
        env_path = os.path.join(project_root, '.env')
        
        if os.path.exists(env_path):
            load_dotenv(env_path)
            logger.info(f"Loaded environment variables from {env_path}")
        else:
            logger.warning(f"No .env file found at {env_path}")
    
    def _load_from_env(self) -> None:
        """Load configuration from environment variables"""
        env_mapping = {
            "download_dir": "SOURCE_DIR",
            "log_file": "PYTHON_LOG_FILE",
            "file_history_path": "FILE_HISTORY_PATH", 
            "monitoring_interval_seconds": "MONITORING_INTERVAL_SECONDS",
            "smb_server": "SMB_SERVER",
            "smb_share": "SMB_SHARE",
            "smb_username": "SMB_USERNAME",
            "smb_password": "SMB_PASSWORD",
            "smb_domain": "SMB_DOMAIN",
            "clean_original_files": "CLEAN_ORIGINAL_FILES",
            "cleanup_rar_files": "CLEANUP_RAR_FILES",
            "dry_run": "DRY_RUN",
            "api_base_url": "PYTHON_API_URL",
            "dashboard_api_url": "DASHBOARD_API_URL",
            "dashboard_api_enabled": "DASHBOARD_API_ENABLED",
            "malayalam_movie_path": "MALAYALAM_MOVIE_PATH",
            "malayalam_tv_path": "MALAYALAM_TV_PATH",
            "english_movie_path": "ENGLISH_MOVIE_PATH",
            "english_tv_path": "ENGLISH_TV_PATH",
            "bollywood_movie_path": "BOLLYWOOD_MOVIE_PATH",
            "bollywood_tv_path": "BOLLYWOOD_TV_PATH",
            "extract_audio_tracks": "EXTRACT_AUDIO_TRACKS",
            "extract_subtitles": "EXTRACT_SUBTITLES",
            "extract_malayalam_only": "EXTRACT_MALAYALAM_ONLY",
            "preferred_language": "PREFERRED_LANGUAGE",
            "preferred_audio_langs": "PREFERRED_AUDIO_LANGS",
            "preferred_subtitle_langs": "PREFERRED_SUBTITLE_LANGS"
        }
        
        for config_key, env_key in env_mapping.items():
            env_value = os.getenv(env_key)
            if env_value is not None:
                # Convert string boolean values
                if env_value.lower() in ('true', 'false'):
                    env_value = env_value.lower() == 'true'
                # Convert string numeric values
                elif env_value.isdigit():
                    env_value = int(env_value)
                    
                self.config[config_key] = env_value
                
        # Handle media extensions list
        media_ext = os.getenv("MEDIA_EXTENSIONS")
        if media_ext:
            self.config["media_extensions"] = [ext.strip() for ext in media_ext.split(",")]
    
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
    
    def get_config(self) -> Dict[str, Any]:
        """Get the complete configuration dictionary"""
        return self.config.copy()
    
    def set(self, key: str, value: Any) -> None:
        """Set configuration value"""
        self.config[key] = value
    
    def update(self, updates: Dict[str, Any]) -> None:
        """Update multiple configuration values"""
        self.config.update(updates)