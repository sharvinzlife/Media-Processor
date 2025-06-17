#!/usr/bin/env python3
"""Logging setup utilities for Media Processor"""

import os
import logging
from typing import Optional

def setup_logging(log_file: Optional[str] = None, log_level: str = "INFO") -> logging.Logger:
    """Setup logging configuration"""
    
    # Create logger
    logger = logging.getLogger("MediaProcessor")
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler if log file specified
    if log_file:
        try:
            # Create log directory if it doesn't exist
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            
            logger.info(f"Logging to file: {log_file}")
        except Exception as e:
            logger.warning(f"Could not setup file logging: {e}")
    
    return logger

def get_logger(name: str = "MediaProcessor") -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(name)