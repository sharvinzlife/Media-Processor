# Changelog

All notable changes to the Media Processor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v3.3.7] - 2025-06-21

### 🔧 Fixed - Dashboard & System Improvements

#### Dashboard Statistics Display
- **Fixed**: Dashboard statistics showing zero counts for all media types
- **Fixed**: Statistics now properly display actual file counts from processed media
- **Result**: English Movies: 3, Malayalam Movies: 1, Malayalam TV Shows: 6

#### Time Display Issues
- **Fixed**: File history showing "just now" for all processed dates
- **Fixed**: Implemented proper relative time formatting ("2h ago", "3d ago", etc.)
- **Added**: Enhanced date parsing for robust timestamp handling

#### SMB Diagnostics
- **Fixed**: SMB connection diagnostics failing due to incorrect configuration reading
- **Updated**: API server to read SMB settings from `.env` file instead of config.sh
- **Added**: Proper SMB_USERNAME variable handling (was looking for SMB_USER)
- **Enhanced**: SMB connection testing with improved error handling

#### Missing API Endpoints
- **Added**: `/api/file-history` endpoint for dashboard file history display
- **Added**: `/api/smb-settings` endpoint for SMB configuration management
- **Fixed**: Missing sync-stats.js script for real-time statistics synchronization

#### Service Log Commands
- **Updated**: README.md and CLAUDE.md with correct journalctl commands
- **Fixed**: Service names in documentation (media-processor-py.service vs media-processor.service)
- **Added**: Alternative log viewing commands for different use cases

### 🛠️ Technical Changes

#### API Server Improvements
- **Enhanced**: `/api/system-logs` endpoint to try multiple service names
- **Fixed**: Configuration file reading to use `.env` instead of config.sh
- **Improved**: Date formatting and validation in file history processing

#### Statistics Synchronization
- **Created**: `sync-stats.js` script for real-time dashboard data sync
- **Created**: `fix-dashboard-stats.js` for continuous stats monitoring
- **Created**: `test-dashboard-fixes.js` for validation testing

#### Documentation Updates
- **Updated**: CLAUDE.md with v3.3.7 changes and fixes
- **Updated**: README.md with correct log viewing commands
- **Created**: CHANGELOG.md to track all project changes

### 🎯 Commands Working Now

```bash
# View logs (these commands now work correctly)
journalctl -u media-processor-py.service -f
sudo journalctl -f -u media-processor-py.service

# Dashboard statistics display correctly
# SMB diagnostics now functional
# File history shows proper timestamps
```

## [v3.3.6] - 2025-06-20

### Fixed
- Dashboard statistics display issues
- Malayalam extraction improvements
- Web interface integration enhancements

## [v3.3.5] - 2025-06-19

### Improved
- SMB authentication reliability
- Enhanced Malayalam processing
- Service monitoring capabilities

## [v3.3.3] - 2025-06-18

### Fixed
- Diagnostics JSON parsing errors
- Process monitoring improvements
- Service restart reliability

## [v3.3.2] - 2025-06-17

### Removed
- SMB settings from legacy configuration
- Fixed virtual environment path issues

## [v3.3.1] - 2025-06-16

### Enhanced Malayalam Processing & SMB Authentication

#### Malayalam-Only Track Extraction
- Extract ONLY Malayalam audio + English subtitles
- Delete ALL other tracks (Hindi, Tamil, Telugu, etc.)
- Significant file size reduction (40-60%)
- Enhanced logging of track analysis

#### Malayalam Filename Sanitization
- Remove redundant language indicators from processed files
- Clean up Malayalam, Mal, ML tags from filenames
- Professional organization with standardized naming

#### Enhanced SMB Authentication
- NTLMV2 authentication support
- SMB2/SMB3 protocol enforcement
- Domain credentials file with proper formatting
- Enhanced smbclient options for better compatibility

## [v3.3.0] - 2025-06-15

### Unified Configuration System
- Migrated from JSON to `.env` configuration
- Single source of truth for all components
- Automatic migration from legacy configs
- Environment variable mapping for all services

## [v3.2.0] - 2025-06-14

### Automated Dependency Management
- Universal installer script with platform detection
- Zero manual installation required
- Platform-specific dependency files
- Python requirements with platform markers

## [v3.1.0] - 2025-06-13

### Cross-Platform Support
- Windows support via PowerShell scripts and NSSM
- Enhanced macOS LaunchAgents
- Platform-specific service management
- Universal setup experience

## [v3.0.0] - 2025-06-12

### Complete Python Modularization
- Full migration from shell scripts to Python modules
- Unified file history format
- Enhanced error handling and recovery
- Recursive directory scanning with `os.walk()`
- Eliminated all code duplication