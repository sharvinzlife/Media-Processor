#!/bin/bash

# Dashboard API Library
# Functions for communicating with the dashboard API

# Import logger if not already loaded
if ! type log > /dev/null 2>&1; then
    source "$(dirname "$0")/logger.sh"
fi

# Import config if not already loaded
if [ -z "$DASHBOARD_API_URL" ]; then
    source "$(dirname "$0")/config.sh"
fi

# Function to post processed file information to the dashboard API
dashboard_post_data() {
    local filename="$1"
    local size_bytes="$2"
    local media_type="$3"
    local language="$4"
    local status="$5"  # "success" or "failed"
    local path="$6"
    
    # Only attempt to post if API endpoint is configured and enabled
    if [ -z "$DASHBOARD_API_URL" ] || [ "$DASHBOARD_API_ENABLED" != "true" ]; then
        [ -z "$DASHBOARD_API_URL" ] && log "Dashboard API URL not configured, skipping dashboard update"
        [ "$DASHBOARD_API_ENABLED" != "true" ] && log "Dashboard API disabled, skipping dashboard update" 
        return 0
    fi
    
    # Generate current timestamp in ISO format
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Format size in human-readable format
    local size_formatted=""
    if [ $size_bytes -gt 1073741824 ]; then # > 1GB
        size_formatted="$(echo "scale=1; $size_bytes/1073741824" | bc)GB"
    else
        size_formatted="$(echo "scale=0; $size_bytes/1048576" | bc)MB"
    fi
    
    # Create appropriate payload based on status
    local payload=""
    
    # Normalize media_type to match API expectations (movie or tvshow)
    if [ "$media_type" = "tvshow" ] || [ "$media_type" = "tv" ]; then
        media_type="tvshow"
    else
        media_type="movie"
    fi
    
    # Normalize language to match API expectations
    language=$(echo "$language" | tr '[:upper:]' '[:lower:]')
    if [ "$language" != "english" ] && [ "$language" != "malayalam" ]; then
        log "WARNING: Unrecognized language: $language, defaulting to 'unknown'"
        language="unknown"
    fi
    
    if command -v jq >/dev/null 2>&1; then
        payload=$(jq -n \
            --arg name "$filename" \
            --arg path "$path" \
            --arg type "$media_type" \
            --arg language "$language" \
            --arg size "$size_formatted" \
            --arg processed_at "$timestamp" \
            --arg status "$status" \
            '{name: $name, path: $path, type: $type, language: $language, size: $size, processedAt: $processed_at, status: $status}')
    else
        # Fallback to manual JSON formatting if jq not available
        payload="{\"name\":\"$filename\",\"path\":\"$path\",\"type\":\"$media_type\",\"language\":\"$language\",\"size\":\"$size_formatted\",\"processedAt\":\"$timestamp\",\"status\":\"$status\"}"
    fi
    
    log "Sending file info to dashboard: $filename ($media_type, $language, $status)"
    
    # Use curl with proper headers, method and error handling
    if command -v curl >/dev/null 2>&1; then
        # Try to auto-detect the correct API endpoint
        local api_endpoint=""
        
        # First try the standard stats/add endpoint
        api_endpoint="${DASHBOARD_API_URL}/api/stats/add"
        local max_retries=3
        local retry=0
        local success=false
        
        while [ $retry -lt $max_retries ] && [ "$success" = false ]; do
            local response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$payload" \
                --max-time 5 \
                --retry 2 \
                "$api_endpoint" 2>&1)
            
            local curl_status=$?
            
            # Check for HTML error responses (like "Cannot POST /api/stats/add")
            if [ $curl_status -eq 0 ] && ! echo "$response" | grep -q "<!DOCTYPE html>" && ! echo "$response" | grep -q "<html"; then
                log "Successfully posted to dashboard API: $filename"
                log "API Response: $response"
                success=true
                break
            else
                # Try alternative endpoints based on status
                if [ $retry -eq 0 ]; then
                    if [ "$status" = "success" ]; then
                        api_endpoint="${DASHBOARD_API_URL}/api/media/processed"
                    else
                        api_endpoint="${DASHBOARD_API_URL}/api/media/failed"
                    fi
                    log "First attempt failed, trying alternative endpoint: $api_endpoint"
                elif [ $retry -eq 1 ]; then
                    # Try another port as fallback - use port 3001 explicitly since that worked in the logs
                    local alt_port_url="http://localhost:3001" 
                    api_endpoint="${alt_port_url}/api/media/processed"
                    log "Second attempt failed, trying alternative endpoint: $api_endpoint"
                fi
                
                retry=$((retry + 1))
                # Log error detail if available in the response
                if echo "$response" | grep -q "Cannot POST"; then
                    log "API error: $(echo "$response" | grep -o "Cannot POST [^ ]*")"
                fi
                log "Failed to post to dashboard API (attempt $retry/$max_retries): $curl_status"
                if [ $retry -lt $max_retries ]; then
                    # Exponential backoff: 1s, 2s, 4s
                    sleep $((2**(retry-1)))
                fi
            fi
        done
        
        if [ "$success" = false ]; then
            log "ERROR: Failed to post to dashboard API after $max_retries attempts"
            return 1
        fi
    else
        log "WARNING: curl not found, cannot post to dashboard API"
        return 1
    fi
    
    return 0
}

# Function to update media counts on the dashboard
update_media_counts() {
    # Only attempt to update if API endpoint is configured and enabled
    if [ -z "$DASHBOARD_API_URL" ] || [ "$DASHBOARD_API_ENABLED" != "true" ]; then
        [ -z "$DASHBOARD_API_URL" ] && log "Dashboard API URL not configured, skipping media counts update"
        [ "$DASHBOARD_API_ENABLED" != "true" ] && log "Dashboard API disabled, skipping media counts update"
        return 0
    fi
    
    local success=false
    local api_endpoints=(
        "${DASHBOARD_API_URL}/api/media/update-counts"
        "http://localhost:3001/api/media/update-counts"
        "${DASHBOARD_API_URL}/api/stats/update-counts"
    )
    
    log "Triggering media counts update on dashboard"
    
    if command -v curl >/dev/null 2>&1; then
        for api_endpoint in "${api_endpoints[@]}"; do
            local response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "{}" \
                --max-time 5 \
                "$api_endpoint" 2>&1)
            
            local curl_status=$?
            # Check for HTML error responses
            if [ $curl_status -eq 0 ] && ! echo "$response" | grep -q "<!DOCTYPE html>" && ! echo "$response" | grep -q "<html"; then
                log "Successfully triggered media counts update at $api_endpoint"
                success=true
                break
            else
                # Log error detail if available in the response
                if echo "$response" | grep -q "Cannot POST"; then
                    log "API error: $(echo "$response" | grep -o "Cannot POST [^ ]*")"
                fi
                log "Failed to update media counts at $api_endpoint, trying next endpoint..."
            fi
        done
        
        if [ "$success" = false ]; then
            log "ERROR: Failed to trigger media counts update on all endpoints"
            return 1
        fi
    else
        log "WARNING: curl not found, cannot trigger media counts update"
        return 1
    fi
    
    return 0
}

# Function to update file history in the dashboard
update_file_history() {
    local filename="$1"
    local media_type="$2"
    local language="$3"
    local path="$4"
    local size="$5"
    local status="$6"
    
    # Only attempt to update if API endpoint is configured and enabled
    if [ -z "$DASHBOARD_API_URL" ] || [ "$DASHBOARD_API_ENABLED" != "true" ]; then
        [ -z "$DASHBOARD_API_URL" ] && log "Dashboard API URL not configured, skipping file history update"
        [ "$DASHBOARD_API_ENABLED" != "true" ] && log "Dashboard API disabled, skipping file history update"
        return 0
    fi
    
    # Normalize media_type to match API expectations
    if [ "$media_type" = "tvshow" ] || [ "$media_type" = "tv" ]; then
        media_type="tvshow"
    else
        media_type="movie"
    fi
    
    # Normalize language to match API expectations
    language=$(echo "$language" | tr '[:upper:]' '[:lower:]')
    
    # Create payload
    local payload=""
    if command -v jq >/dev/null 2>&1; then
        payload=$(jq -n \
            --arg name "$filename" \
            --arg type "$media_type" \
            --arg language "$language" \
            --arg path "$path" \
            --arg size "$size" \
            --arg status "$status" \
            '{name: $name, type: $type, language: $language, path: $path, size: $size, status: $status}')
    else
        # Fallback to manual JSON formatting if jq not available
        payload="{\"name\":\"$filename\",\"type\":\"$media_type\",\"language\":\"$language\",\"path\":\"$path\",\"size\":\"$size\",\"status\":\"$status\"}"
    fi
    
    log "Updating file history in dashboard: $filename ($media_type, $language)"
    
    local api_endpoints=(
        "${DASHBOARD_API_URL}/api/file-history"
        "http://localhost:3001/api/file-history"
    )
    
    local success=false
    
    if command -v curl >/dev/null 2>&1; then
        for api_endpoint in "${api_endpoints[@]}"; do
            local response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$payload" \
                --max-time 5 \
                "$api_endpoint" 2>&1)
            
            local curl_status=$?
            
            # Check for success
            if [ $curl_status -eq 0 ] && ! echo "$response" | grep -q "<!DOCTYPE html>" && ! echo "$response" | grep -q "<html"; then
                log "Successfully updated file history at $api_endpoint"
                success=true
                break
            else
                # Log error detail if available in the response
                if echo "$response" | grep -q "Cannot POST"; then
                    log "API error: $(echo "$response" | grep -o "Cannot POST [^ ]*")"
                fi
                log "Failed to update file history at $api_endpoint, trying next endpoint..."
            fi
        done
        
        if [ "$success" = false ]; then
            log "ERROR: Failed to update file history on all endpoints"
            return 1
        fi
    else
        log "WARNING: curl not found, cannot update file history"
        return 1
    fi
    
    return 0
}

# Function to update the dashboard API with transfer status
update_dashboard_api() {
    local status="$1"
    local source_file="$2"
    local target_path="$3"
    
    # Skip if dashboard updates are disabled
    if [ "$DASHBOARD_API_ENABLED" != "true" ]; then
        log "Dashboard API updates disabled, skipping update"
        return 0
    fi
    
    # Extract filename from source path
    local filename=$(basename "$source_file")
    
    # Determine media type
    local media_type="movie"
    if [[ "$target_path" == *"tv-shows"* || "$target_path" == *"/Season"* ]]; then
        media_type="tvshow"
    fi
    
    # Determine language
    local language="english"
    if [[ "$target_path" == *"malayalam"* ]]; then
        language="malayalam"
    fi
    
    # Get file size
    local size_bytes=$(stat -c %s "$source_file" 2>/dev/null || echo "0")
    local size_formatted=""
    if [ $size_bytes -gt 1073741824 ]; then # > 1GB
        size_formatted="$(echo "scale=1; $size_bytes/1073741824" | bc)GB"
    else
        size_formatted="$(echo "scale=0; $size_bytes/1048576" | bc)MB"
    fi
    
    # Convert status codes to API status
    local api_status="success"
    case "$status" in
        "transferStart") api_status="processing" ;;
        "transferSuccess") api_status="success" ;;
        "transferFailed") api_status="failed" ;;
        "transferSkipped") api_status="skipped" ;;
        "dryRun") api_status="dryrun" ;;
    esac
    
    # Updates for different endpoints
    log "Updating dashboard with status: $api_status for $filename"
    
    # Update file history
    update_file_history "$filename" "$media_type" "$language" "$target_path" "$size_formatted" "$api_status"
    
    # For completed transfers, update media counts
    if [ "$status" = "transferSuccess" ]; then
        update_media_counts
    fi
    
    # For transferStart, call the processed endpoint
    if [ "$status" = "transferStart" ]; then
        dashboard_post_data "$filename" "$size_bytes" "$media_type" "$language" "processing" "$target_path"
    elif [ "$status" = "transferSuccess" ]; then
        dashboard_post_data "$filename" "$size_bytes" "$media_type" "$language" "success" "$target_path"
    elif [ "$status" = "transferFailed" ]; then
        dashboard_post_data "$filename" "$size_bytes" "$media_type" "$language" "failed" "$target_path"
    fi
    
    return 0
} 