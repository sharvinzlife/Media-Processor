#!/usr/bin/env python3
"""File history management utilities"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class FileHistoryManager:
    """Manages file processing history"""
    
    def __init__(self, history_file: str):
        """Initialize file history manager"""
        self.history_file = history_file
        
    def load_file_history(self) -> List[Dict[str, Any]]:
        """Load file history from JSON file"""
        if not os.path.exists(self.history_file):
            logger.info(f"File history file not found: {self.history_file}")
            return []
        
        try:
            with open(self.history_file, 'r') as f:
                history = json.load(f)
                if not isinstance(history, list):
                    logger.warning("File history is not a list, returning empty history")
                    return []
                return history
        except Exception as e:
            logger.error(f"Error loading file history: {e}")
            return []
    
    def save_file_history(self, history: List[Dict[str, Any]]) -> bool:
        """Save file history to JSON file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
            
            with open(self.history_file, 'w') as f:
                json.dump(history, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving file history: {e}")
            return False
    
    def add_entry(self, name: str, path: str, media_type: str, language: str, 
                  size: str = "", status: str = "processing") -> bool:
        """Add entry to file history"""
        try:
            history = self.load_file_history()
            
            entry = {
                "name": name,
                "path": path,
                "type": media_type,
                "language": language,
                "size": size,
                "processedAt": datetime.utcnow().isoformat() + "Z",
                "status": status
            }
            
            history.append(entry)
            
            # Keep only last 1000 entries
            if len(history) > 1000:
                history = history[-1000:]
            
            return self.save_file_history(history)
        except Exception as e:
            logger.error(f"Error adding file history entry: {e}")
            return False
    
    def update_status(self, name: str, status: str, path: str = None) -> bool:
        """Update status of an existing entry"""
        try:
            history = self.load_file_history()
            
            # Find the most recent entry with this name
            for i in range(len(history) - 1, -1, -1):
                if history[i].get("name") == name:
                    history[i]["status"] = status
                    history[i]["processedAt"] = datetime.utcnow().isoformat() + "Z"
                    if path:
                        history[i]["path"] = path
                    break
            
            return self.save_file_history(history)
        except Exception as e:
            logger.error(f"Error updating file history status: {e}")
            return False