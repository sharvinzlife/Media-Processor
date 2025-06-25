# Media Processor Naming System Guide

This document explains the unified media naming system implemented in the Media Processor software.

## Overview

The Media Processor naming system is designed to:
1. Clean filenames by removing unwanted tags, website references, and clutter
2. Extract useful media information (resolution, codec, language, etc.)
3. Create consistently formatted filenames that work well with media servers and players
4. Handle both movies and TV shows appropriately

## Core Components

The media naming system consists of three key functions:

### 1. `clean_filename` 
Removes website references, scene group tags, and other unwanted elements from filenames.

Example:
```
Input:  www.TamilMV.cc - The.Movie.2023.1080p.WEB-DL.H264.ESub-Group.mkv
Output: The Movie 2023.mkv
```

### 2. `format_media_name`
Main unified function that creates a properly formatted filename with media information.

Example:
```
Input:  The.Movie.2023.mkv (after cleaning)
Output: The Movie 2023 [English] [1080p] [H.264] [2.5G].mkv
```

### 3. Helper Detection Functions
Various functions to detect:
- Language (`detect_language`)
- Resolution (`detect_resolution`)
- Codec (`detect_codec`)
- Subtitles (`detect_subtitles`)
- Audio tracks (`detect_audio_languages`)

## Using the Naming System

### Basic Usage

In bash scripts, use the `format_media_name` function:

```bash
# Format a file with default options
formatted_name=$(format_media_name "/path/to/movie.mkv")

# Keep original filename but add media tags
formatted_name=$(format_media_name "/path/to/movie.mkv" "keep_tags")

# Exclude file size from the resulting name
formatted_name=$(format_media_name "/path/to/movie.mkv" "no_size")

# Combine multiple options
formatted_name=$(format_media_name "/path/to/movie.mkv" "keep_tags,no_size,no_codec")
```

### Options

The following options can be passed to `format_media_name`:

| Option | Description |
|--------|-------------|
| `keep_tags` | Don't clean the filename; just add media info |
| `no_size` | Don't include file size |
| `no_codec` | Don't include codec information |
| `no_audio` | Don't include audio track info |
| `no_subtitles` | Don't include subtitle info |

## Format Specifications

### Movies

The standard format for movies is:
```
Movie Title [Language] [Resolution] [Codec] [Audio-Info] [Subtitle-Info] [Size].ext
```

Examples:
```
The Batman 2022 [English] [1080p] [H.264] [DUAL-Audio] [Sub-ENG,MAL] [6.2G].mkv
Manjummel Boys [Malayalam] [1080p] [H.265] [2.1G].mkv
```

### TV Shows

TV shows follow this format:
```
Show Name - S01E02 - Episode Title [Language] [Resolution] [Codec] [Audio-Info] [Subtitle-Info] [Size].ext
```

Examples:
```
Breaking Bad - S01E01 - Pilot [English] [1080p] [H.264] [2.1G].mkv
Flowers - S01E03 [Malayalam] [720p] [H.265] [SUB-ENG] [650M].mkv
```

## Cleaning Rules

The filename cleaner removes:

1. Website prefixes (TamilMV, TamilBlasters, etc.)
2. Website references in brackets or parentheses
3. Scene group identifiers (YIFY, RARBG, etc.)
4. Quality and source indicators (WEB-DL, BDRip, etc.)
5. Subtitle indicators (ESub, etc.)
6. Multiple spaces, dots, and underscores

## Implementation Details

The implementation can be found in:
- `lib/media-detection.sh` - Core naming and detection functions
- `lib/file-transfer.sh` - File transfer functions using the naming system
- `media-processor.sh` - Main script using the naming functions

## Customizing the Naming System

To customize the naming system:

1. Edit the `format_media_name` function in `lib/media-detection.sh`
2. Add new detection functions as needed
3. Update the `clean_filename` function to handle additional unwanted patterns

## Best Practices

1. Always use `format_media_name` rather than building your own naming logic
2. For TV shows with complex naming, provide the series name and season/episode info
3. Use the options parameter to customize behavior rather than modifying the core function 