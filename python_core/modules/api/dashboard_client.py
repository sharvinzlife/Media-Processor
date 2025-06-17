#!/usr/bin/env python3
"""Dashboard API client for status updates"""

import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

class DashboardApiClient:
    """Client for interacting with the dashboard API"""
    
    def __init__(self, api_url: str, enabled: bool = True):
        """Initialize the API client"""
        self.api_url = api_url
        self.enabled = enabled
        
    def update_dashboard_api(self, status: str, source_file: str, target_path: str, 
                            media_type: str, language: str, size_bytes: int, 
                            error_message: Optional[str] = None) -> bool:
        """Update the dashboard API with transfer status"""
        if not self.enabled:
            logger.info("Dashboard API updates disabled, skipping update")
            return True
            
        # Extract filename from source path
        filename = os.path.basename(source_file)
        
        # Convert size to human readable format
        size_str = self._format_size(size_bytes)
        
        # Prepare update data
        update_data = {
            "name": filename,
            "path": target_path,
            "type": media_type,
            "language": language,
            "size": size_str,
            "processedAt": "",  # Will be set by API
            "status": status
        }
        
        if error_message:
            update_data["error"] = error_message
            
        try:
            # Send update to dashboard API
            endpoint = f"{self.api_url}/api/file-history"
            logger.info(f"Sending update to Dashboard API ({endpoint}): {update_data}")
            
            response = requests.post(endpoint, json=update_data, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"Dashboard API update response for {filename}: {response.status_code}")
                return True
            else:
                logger.warning(f"Dashboard API update failed for {filename}: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating dashboard API for {filename}: {e}")
            return False
    
    def _format_size(self, size_bytes: int) -> str:
        """Convert bytes to human readable format"""
        if size_bytes == 0:
            return "0B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
            
        return f"{size:.1f}{size_names[i]}"