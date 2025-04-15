# Media Processor Refactoring

## Overview

This document describes the refactoring changes made to the Media Processor system to improve modularity, fix frontend issues, and enhance Malayalam language extraction.

## Changes Made

### 1. Script Modularization

The original monolithic `media-processor.sh` script has been refactored into smaller, more maintainable modules:

- **config.sh**: All configuration variables
- **utils.sh**: Common utility functions
- **media-detection.sh**: Media type detection and metadata extraction
- **language-extraction.sh**: Language detection and extraction
- **file-transfer.sh**: SMB connection and file transfer
- **cleanup.sh**: Cleanup operations for temporary files and directories
- **media-processor.sh**: Main script that orchestrates all modules

### 2. Frontend Fixes

The web interface has been updated to fix issues with:

- **Service Status Detection**: Improved detection logic with multiple fallback methods
- **Diagnostics Error**: Fixed the "data.logs is undefined" error with proper error handling
- **API Endpoints**: Updated to work with the new modular structure

### 3. Malayalam Language Extraction Enhancement

The Malayalam language extraction functionality has been significantly improved:

- **Better Track Detection**: Enhanced detection of Malayalam audio tracks
- **Multiple Track Handling**: Improved handling of files with multiple audio tracks
- **Fallback Mechanisms**: Added fallbacks when language codes are not standard

## Directory Structure

```
media-processor/
├── bin/
│   └── media-processor.sh (main entry script)
├── lib/
│   ├── config.sh (configuration variables)
│   ├── utils.sh (utility functions)
│   ├── media-detection.sh (media type detection)
│   ├── language-extraction.sh (language extraction)
│   ├── file-transfer.sh (file transfer functions)
│   └── cleanup.sh (cleanup operations)
├── web-app/
│   ├── api/
│   │   └── server.js (backend API)
│   └── build/ (frontend files)
├── media-processor.service (systemd service file)
├── restart-services.sh (service restart script)
└── REFACTORING.md (this file)
```

## How to Use

### Starting the Services

1. Run the restart script to apply changes and restart services:

```bash
./restart-services.sh
```

2. Access the web interface at:

```
http://localhost:3001
```

### Configuration

All configuration is now centralized in `lib/config.sh`. You can modify this file directly or use the web interface to update settings.

### Monitoring

- Check service status: `systemctl status media-processor.service`
- View logs: `tail -f /home/sharvinzlife/media-processor.log`
- Use the web interface for real-time monitoring

## Improvements

### Modularity

- Each module has a single responsibility
- Easier to maintain and extend
- Better organization of code

### Error Handling

- Improved error detection and reporting
- Better logging of issues
- Fallback mechanisms for critical operations

### Malayalam Language Support

- Better detection of Malayalam content
- Improved extraction of Malayalam audio tracks
- Support for multiple audio tracks

## Troubleshooting

If you encounter issues:

1. Check the logs: `tail -f /home/sharvinzlife/media-processor.log`
2. Verify service status: `systemctl status media-processor.service`
3. Check web interface service: `systemctl status media-processor-web.service`
4. Restart services: `./restart-services.sh`

## Future Improvements

- Add unit tests for each module
- Implement more detailed logging
- Add support for more media formats
- Enhance the web interface with more features