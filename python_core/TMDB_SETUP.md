# TMDB API Integration Setup

The Media Processor now includes intelligent movie title lookup using The Movie Database (TMDB) API. This provides accurate movie titles and metadata for better file organization.

## Getting a TMDB API Key

1. **Create a TMDB Account**
   - Go to https://www.themoviedb.org/
   - Click "Sign Up" and create a free account

2. **Request API Access**
   - Go to https://www.themoviedb.org/settings/api
   - Click "Create" under "Request an API Key"
   - Select "Developer" when asked about the type of use
   - Fill out the form with your project details:
     - Application Name: "Media Processor"
     - Application Summary: "Personal media organization system"
     - Application URL: Leave blank or use your local setup
     - Application Usage: "Personal media file organization and naming"

3. **Get Your API Key**
   - Once approved, you'll receive your API key
   - Copy the "API Key (v3 auth)" value

## Configuration

Add your TMDB API key to the `.env` file:

```bash
# TMDB API configuration for intelligent movie title lookup
TMDB_API_KEY="your-api-key-here"
TMDB_INCLUDE_YEAR=true
TMDB_INCLUDE_ID=false
TMDB_FALLBACK_ENABLED=true
```

### Configuration Options

- **TMDB_API_KEY**: Your TMDB API key (required for TMDB features)
- **TMDB_INCLUDE_YEAR**: Whether to include release year in sanitized titles (default: true)
- **TMDB_INCLUDE_ID**: Whether to include TMDB ID in filename (default: false)
- **TMDB_FALLBACK_ENABLED**: Whether to use fallback cleaning when TMDB fails (default: true)

## How It Works

### Before TMDB Integration
```
Input:  "Casino 1995 1080p MAX WEB-DL DDP 5.1 H265-PiRaTeS.mkv"
Output: "Casino 1995 1080p.mkv"
```

### With TMDB Integration
```
Input:  "Casino 1995 1080p MAX WEB-DL DDP 5.1 H265-PiRaTeS.mkv"
TMDB:   Finds "Casino (1995)" directed by Martin Scorsese
Output: "Casino (1995).mkv"
```

## Features

### Intelligent Title Extraction
- Extracts movie title and year from messy filenames
- Handles torrent site prefixes, quality indicators, and release group tags
- Preserves original formatting preferences

### TMDB Lookup
- Searches TMDB database for accurate movie information
- Matches by title and year for better accuracy
- Provides official movie titles and metadata

### Fallback Protection
- Automatically falls back to traditional cleaning if TMDB fails
- Works without API key (uses fallback cleaning)
- Handles network failures gracefully

### Rate Limiting
- Respects TMDB API limits (40 requests per 10 seconds)
- Includes automatic rate limiting and retry logic
- Caches results to minimize API calls

## Testing

Test the integration with:

```bash
cd python_core
source venv/bin/activate
python test_tmdb_integration.py
```

## Troubleshooting

### No TMDB API Key
- System will use fallback cleaning (traditional method)
- Add API key to `.env` file to enable TMDB features

### API Key Not Working
- Verify the API key is correct in `.env` file
- Check if the API key has been approved by TMDB
- Ensure you're using the "API Key (v3 auth)" not the "API Read Access Token"

### Network Issues
- System automatically falls back to traditional cleaning
- Check internet connection and TMDB service status
- Rate limiting will pause requests if limit exceeded

### Poor Matches
- System prefers title + year matches for accuracy
- Falls back to title-only search if no year match
- Uses fallback cleaning if no TMDB match found

## Example Transformations

| Original Filename | TMDB Result | Fallback Result |
|-------------------|-------------|-----------------|
| `Casino 1995 1080p MAX WEB-DL DDP 5.1 H265-PiRaTeS.mkv` | `Casino (1995).mkv` | `Casino 1995 1080p.mkv` |
| `Sanet.st.The.Godfather.1972.1080p.BluRay.x264-LAMA.mkv` | `The Godfather (1972).mkv` | `The Godfather (1972) 1080p.mkv` |
| `[YTS.MX] Pulp Fiction (1994) [1080p] [BluRay].mp4` | `Pulp Fiction (1994).mp4` | `Pulp Fiction (1994).mp4` |
| `www.TamilMV.re - Inception 2010 IMAX 1080p.mkv` | `Inception (2010).mkv` | `Inception 2010 IMAX 1080p.mkv` |

The TMDB integration provides cleaner, more consistent naming while maintaining full compatibility with the existing system.