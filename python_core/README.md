# Media Processor

Python-based media processing system for organizing and transferring media files.

## Features

- Configuration loading from JSON
- Media attribute detection (type, language, resolution, subtitles)
- Language track extraction using `mkvmerge`
- Structured filename and path formatting
- SMB file transfer to remote shares
- Cleanup of temporary files and directories
- Integration with Python API server for status updates

## Setup

1. Install dependencies:

```bash
./install_dependencies.sh
```

2. Activate the virtual environment:

```bash
source .venv/bin/activate
```

3. Run the processor:

```bash
# Process a single file
python media_processor.py /path/to/file.mkv

# Start monitoring mode
python media_processor.py

# Dry run mode
python media_processor.py --dry-run
```

## Configuration

The default configuration file is located at `/etc/media-processor/config.json`. You can specify a different path using the `--config` flag.

See `media_processor.py` for the default configuration options. 