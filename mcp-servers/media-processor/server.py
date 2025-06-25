#!/usr/bin/env python3
"""
Media Processor MCP Server
Provides AI-accessible tools for media processing operations
"""

import asyncio
import json
import sys
from typing import Dict, Any, List
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from mcp import Tool, Server
    from mcp.types import TextContent
except ImportError:
    print("MCP not installed. Install with: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Import project modules
try:
    from python_core.modules.media.detector import MediaDetector
    from python_core.modules.config.settings import ConfigManager
except ImportError as e:
    print(f"Could not import project modules: {e}", file=sys.stderr)
    print("Make sure you're running from the project root", file=sys.stderr)
    sys.exit(1)

class MediaProcessorMCPServer(Server):
    def __init__(self):
        super().__init__("media-processor")
        self.detector = MediaDetector()
        self.config = ConfigManager()
    
    @Tool("detect_media_info")
    async def detect_media_info(self, filename: str) -> Dict[str, Any]:
        """
        Detect language, media type, and processing recommendations for a media file
        
        Args:
            filename: Name of the media file to analyze
            
        Returns:
            Dictionary with detection results and recommendations
        """
        try:
            result = {
                "filename": filename,
                "language": self.detector.detect_language_from_filename(filename),
                "media_type": self.detector.detect_media_type(filename),
                "processing_recommendations": []
            }
            
            # Add processing recommendations based on detection
            if result["language"] == "malayalam":
                result["processing_recommendations"].append("Extract Malayalam audio tracks only")
                result["processing_recommendations"].append("Extract English subtitle tracks")
                result["processing_recommendations"].append("Remove other language tracks")
            
            return result
            
        except Exception as e:
            return {"error": str(e), "filename": filename}
    
    @Tool("get_config_info") 
    async def get_config_info(self) -> Dict[str, Any]:
        """
        Get current configuration information
        
        Returns:
            Dictionary with configuration details (sensitive data masked)
        """
        try:
            config_info = {
                "source_directory": self.config.get("SOURCE_DIRECTORY", "Not set"),
                "smb_server": self.config.get("SMB_SERVER", "Not set"),
                "smb_share": self.config.get("SMB_SHARE", "Not set"),
                "malayalam_movies_path": self.config.get("MALAYALAM_MOVIES_PATH", "Not set"),
                "english_movies_path": self.config.get("ENGLISH_MOVIES_PATH", "Not set"),
            }
            return config_info
            
        except Exception as e:
            return {"error": str(e)}
    
    @Tool("list_processing_patterns")
    async def list_processing_patterns(self) -> List[Dict[str, str]]:
        """
        List all media processing patterns and their descriptions
        
        Returns:
            List of pattern dictionaries with pattern and description
        """
        try:
            # This would integrate with the actual pattern system
            patterns = [
                {
                    "pattern": "malayalam|mal|ml|kerala|mollywood",
                    "description": "Malayalam content detection",
                    "action": "Extract Malayalam audio + English subtitles only"
                },
                {
                    "pattern": "hindi|bollywood|multi|dual",
                    "description": "Hindi/Bollywood content detection", 
                    "action": "Standard processing without extraction"
                },
                {
                    "pattern": "S\\d{2}E\\d{2}|s\\d{2}e\\d{2}",
                    "description": "TV show episode detection",
                    "action": "Organize into series/season folders"
                }
            ]
            return patterns
            
        except Exception as e:
            return [{"error": str(e)}]

async def main():
    """Main entry point for the MCP server"""
    server = MediaProcessorMCPServer()
    
    # Run the server
    from mcp.server.stdio import stdio_server
    async with stdio_server() as streams:
        await server.run(*streams)

if __name__ == "__main__":
    asyncio.run(main())
