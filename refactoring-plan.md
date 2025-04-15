# Media Processor Refactoring Plan

## Overview

This document outlines the detailed plan for refactoring the Media Processor system to address the following issues:

1. **Script Modularity**: Breaking down the large `media-processor.sh` script into smaller, more manageable modules
2. **Frontend Issues**: Fixing the web interface status display and diagnostics errors
3. **Malayalam Language Extraction**: Improving the detection and extraction of Malayalam language tracks

## 1. Script Refactoring

### Directory Structure

We'll create the following directory structure:

```
media-processor/
├── bin/
│   └── media-processor.sh (main entry script)
├── lib/
│   ├── config.sh
│   ├── utils.sh
│   ├── media-detection.sh
│   ├── language-extraction.sh
│   ├── file-transfer.sh
│   └── cleanup.sh
├── service/
│   └── media-processor.service
└── web-app/
    ├── api/
    └── build/
```

### Module Breakdown

#### 1.1 config.sh
- All configuration variables
- Environment settings
- Path definitions

#### 1.2 utils.sh
- Logging functions
- File operation utilities
- Common helper functions
- Required tools checking

#### 1.3 media-detection.sh
- Media type detection (movie/TV show)
- Filename cleaning
- Season/episode extraction
- Series name extraction

#### 1.4 language-extraction.sh
- Language detection
- Audio track extraction
- Subtitle handling
- Enhanced Malayalam track detection and extraction

#### 1.5 file-transfer.sh
- SMB connection functions
- Directory creation
- File transfer logic
- Transfer verification

#### 1.6 cleanup.sh
- RAR file cleanup
- Empty directory removal
- Temporary file management

#### 1.7 media-processor.sh (main script)
- Imports all modules
- Main execution flow
- Service management

### Implementation Steps

1. **Create Directory Structure**
   - Create the `lib` directory for modules
   - Set up proper file permissions

2. **Extract Configuration**
   - Move all configuration variables to `config.sh`
   - Add documentation for each setting

3. **Create Utility Module**
   - Extract common functions to `utils.sh`
   - Standardize logging and error handling

4. **Implement Media Detection Module**
   - Move media type detection logic to `media-detection.sh`
   - Enhance filename cleaning and metadata extraction

5. **Enhance Language Extraction**
   - Create `language-extraction.sh` with improved Malayalam support
   - Implement better track selection for multiple audio tracks

6. **Refactor File Transfer Logic**
   - Move SMB-related functions to `file-transfer.sh`
   - Improve error handling and retry mechanisms

7. **Separate Cleanup Functions**
   - Extract cleanup logic to `cleanup.sh`
   - Add better age-based cleanup options

8. **Create Main Script**
   - Develop new main script that sources all modules
   - Implement cleaner execution flow

9. **Update Service Configuration**
   - Modify service file to use the new main script
   - Ensure proper permissions

## 2. Frontend Fixes

### 2.1 Service Status Detection

1. **Improve Status Detection Logic**
   - Enhance the API server's service status detection
   - Add multiple detection methods (process check, systemd status)
   - Implement proper error handling

2. **Update Status Endpoint**
   - Modify `/api/status` endpoint to be more robust
   - Add fallback mechanisms if primary detection fails
   - Include more detailed status information

### 2.2 Diagnostics Error Fix

1. **Fix Diagnostics Endpoint**
   - Update `/api/diagnostics` endpoint to handle undefined logs
   - Add proper error checking before accessing log data
   - Implement fallback for missing data

2. **Enhance Error Reporting**
   - Improve error messages in the API responses
   - Add more detailed diagnostics information
   - Implement better client-side error handling

### 2.3 Frontend Improvements

1. **Update Status Display**
   - Enhance the frontend to better handle service status changes
   - Add visual indicators for different status states
   - Implement auto-refresh for status updates

2. **Improve Error Handling**
   - Add better error handling in the frontend
   - Display user-friendly error messages
   - Implement retry mechanisms for failed API calls

## 3. Malayalam Language Extraction Enhancement

### 3.1 Language Detection Improvements

1. **Enhance Detection Algorithm**
   - Improve the language detection logic to better identify Malayalam content
   - Add support for various naming conventions
   - Implement more robust pattern matching

2. **Track Metadata Analysis**
   - Add better analysis of track metadata
   - Implement language code normalization
   - Support for various language code formats

### 3.2 Multiple Track Handling

1. **Track Selection Logic**
   - Implement intelligent track selection for multiple audio tracks
   - Add priority-based selection for Malayalam tracks
   - Support for preserving multiple language tracks when needed

2. **MKV Processing Enhancement**
   - Improve MKV track extraction logic
   - Add better error handling for mkvmerge operations
   - Implement verification of extracted tracks

### 3.3 Testing and Validation

1. **Test Cases**
   - Create test cases for different Malayalam media scenarios
   - Test with single and multiple audio tracks
   - Validate correct track selection and extraction

2. **Logging and Monitoring**
   - Add detailed logging for language detection and extraction
   - Implement monitoring for extraction success/failure
   - Add statistics collection for language processing

## Implementation Timeline

### Phase 1: Script Refactoring (Week 1)
- Days 1-2: Create directory structure and extract configuration
- Days 3-4: Implement utility and media detection modules
- Days 5-7: Develop language extraction and file transfer modules

### Phase 2: Frontend Fixes (Week 2)
- Days 1-2: Fix service status detection
- Days 3-4: Resolve diagnostics errors
- Days 5-7: Implement frontend improvements

### Phase 3: Malayalam Language Enhancement (Week 3)
- Days 1-3: Improve language detection algorithm
- Days 4-5: Enhance multiple track handling
- Days 6-7: Testing and validation

## Success Criteria

1. **Script Modularity**
   - All functionality properly separated into modules
   - Main script under 200 lines
   - Each module has a single responsibility

2. **Frontend Functionality**
   - Service status correctly displayed
   - No diagnostics errors
   - Smooth user experience

3. **Malayalam Language Support**
   - Correct detection of Malayalam content
   - Proper extraction of Malayalam audio tracks
   - Support for multiple audio tracks

## Conclusion

This refactoring plan will significantly improve the maintainability, reliability, and functionality of the Media Processor system. By breaking down the monolithic script into modules, fixing frontend issues, and enhancing language support, we'll create a more robust and user-friendly media management solution.